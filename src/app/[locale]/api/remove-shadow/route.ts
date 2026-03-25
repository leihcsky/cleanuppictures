import { getReplicateClient } from "~/libs/replicateClient";

// KIE API Configuration
const KIE_UPLOAD_BASE_URL = "https://kieai.redpandaai.co";
const KIE_API_BASE_URL = "https://api.kie.ai";

interface KieUploadResponse {
  success: boolean;
  code: number;
  msg: string;
  data: {
    fileUrl: string;
    fileId: string;
  };
}

interface KieGenerateResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

interface KieTaskDetailsResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    successFlag: number; // 0: Generating, 1: Success, 2: Failed
    progress: string;
    response?: {
      result_urls: string[];
    };
    failReason?: string;
    errorMessage?: string;
    // Fallback fields based on observation/other docs
    resultUrl?: string;
    url?: string;
    results?: string[] | { url: string }[];
  };
}

async function uploadToKie(base64Data: string, apiKey: string): Promise<string> {
  // Use the Base64 upload endpoint
  const url = `${KIE_UPLOAD_BASE_URL}/api/file-base64-upload`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64Data,
      uploadPath: "cleanuppictures/uploads",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KIE Upload failed: ${response.status} ${errorText}`);
  }

  const result = (await response.json()) as KieUploadResponse;
  console.log("KIE Upload Result:", JSON.stringify(result));

  if (result.code !== 200) {
    throw new Error(`KIE Upload error: ${result.msg || "Unknown error"}`);
  }

  // Check for various possible URL fields
  // Some KIE APIs return fileUrl, some return url, some return downloadUrl
  const fileUrl = result.data?.fileUrl || (result.data as any)?.url || (result.data as any)?.downloadUrl;

  if (!fileUrl) {
    throw new Error(`KIE Upload error: URL not found in response. Data: ${JSON.stringify(result.data)}`);
  }

  return fileUrl;
}

async function generate4oImage(
  apiKey: string,
  imageUrl: string,
  maskUrl: string,
  prompt: string,
  scene: string
): Promise<string> {
  const url = `${KIE_API_BASE_URL}/api/v1/gpt4o-image/generate`;
  
  // Default to 1:1 as we don't have aspect ratio logic yet. 
  // Ideally should match image ratio (1:1, 3:2, 2:3).
  const size = "1:1"; 

  const body = {
    filesUrl: [imageUrl], // Must be an array
    maskUrl: maskUrl || undefined, // Optional
    prompt: prompt,
    size: size,
    nVariants: 1,
    isEnhance: false, 
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KIE Generate failed: ${response.status} ${errorText}`);
  }

  const result = (await response.json()) as KieGenerateResponse;
  if (result.code !== 200 || !result.data?.taskId) {
    throw new Error(`KIE Generate error: ${result.msg || "No taskId returned"}`);
  }

  return await pollKieTask(apiKey, result.data.taskId);
}

async function pollKieTask(apiKey: string, taskId: string): Promise<string> {
  const url = `${KIE_API_BASE_URL}/api/v1/gpt4o-image/record-info?taskId=${taskId}`;
  const maxAttempts = 30; // 60s timeout
  const interval = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.warn(`KIE Poll failed: ${response.status}`);
      continue;
    }

    const result = (await response.json()) as KieTaskDetailsResponse;
    const data = result.data;
    
    if (!data) continue;

    // Check successFlag: 0=Generating, 1=Success, 2=Failed
    if (data.successFlag === 1) {
       console.log("KIE Success Data Dump:", JSON.stringify(data, null, 2));

       // Standard structure according to docs: data.response.result_urls
       let resultUrls: string[] | undefined;
       
       if (data.response) {
         if (typeof data.response === 'string') {
            try {
               const parsedResponse = JSON.parse(data.response);
               resultUrls = parsedResponse.result_urls || parsedResponse.resultUrls;
            } catch (e) {
               console.warn("Failed to parse data.response string", e);
            }
         } else {
            resultUrls = data.response.result_urls || (data.response as any).resultUrls;
         }
       }
       
       if (resultUrls && resultUrls.length > 0) {
         return resultUrls[0];
       }

       // Fallback for different model types (just in case)
       if (data.resultUrl) return data.resultUrl;
       if (data.url) return data.url;
       
       throw new Error(`KIE Task succeeded but image URL not found. Response keys: ${Object.keys(data.response || {}).join(',')}`);
    } else if (data.successFlag === 2) {
       // Failed
       throw new Error(`KIE Task failed: ${data.failReason || data.errorMessage || "Unknown reason"}`);
    }
    // If 0, continue polling
  }

  throw new Error("KIE Task timed out");
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { imageDataUrl, maskDataUrl, kieMaskDataUrl, scene, resizedForLama } = json;

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return Response.json({ msg: "Invalid image input.", status: 400 });
    }

    // Check for KIE API Key first
    const kieApiKey = process.env.KIE_API_KEY;
    
    const basePrompt = "clean background, natural lighting, seamless background continuation";
    const prompt = basePrompt;
    const negative_prompt = "shadow, dark patch, uneven lighting, artifact, blur, distortion";
    const sdPrompt = basePrompt;
    const sdNegativePrompt = "shadow, dark patch, uneven lighting, artifact, blur, distortion";

    // Force use of Replicate for now as per user request to switch model
    // if (kieApiKey) {
    if (false && kieApiKey) { 
      console.log("Using KIE API for shadow removal");
      
      // 1. Upload Image
      const imageUrl = await uploadToKie(imageDataUrl, kieApiKey);
      
      // 2. Upload Mask (if exists)
      // Use KIE-specific mask if available (White=Preserve, Black=Modify)
      // Otherwise fall back to standard mask (Black=Preserve, White=Modify)
      const maskToUse = kieMaskDataUrl || maskDataUrl;
      let maskUrl = "";
      
      if (maskToUse) {
          maskUrl = await uploadToKie(maskToUse, kieApiKey);
      }

      // 3. Generate
      // Note: If using standard mask, the colors might be inverted for KIE (which expects White=Preserve).
      // Ideally, the frontend should always provide kieMaskDataUrl.
      // If only standard mask is present, KIE might modify the wrong area.
      // But we assume frontend sends kieMaskDataUrl now.
      
      const outputUrl = await generate4oImage(kieApiKey, imageUrl, maskUrl, prompt, scene);
      
      return new Response(JSON.stringify({ output_url: outputUrl }), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }

    // Fallback to Replicate
    // Use stability-ai/stable-diffusion-inpainting
    // https://replicate.com/stability-ai/stable-diffusion-inpainting/api
    // Prefer environment variable, otherwise use default official version
    const model = process.env.REPLICATE_SHADOW_MODEL_RUN || "stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3";

    const replicate = getReplicateClient();
    
    // Ensure mask is provided for Inpainting
    if (!maskDataUrl && !kieMaskDataUrl) {
         return Response.json({ msg: "Mask is required for this model. Please paint over the area to remove.", status: 400 });
    }
    
    // Reverted Mask Logic:
    // User confirmed that the inverted mask (kieMaskDataUrl) caused the image to be "messed up".
    // This confirms that the Standard Mask (maskDataUrl: White=Modify, Black=Preserve) was correct all along.
    // The "partial removal" issue is likely due to prompt or model strength, not mask inversion.
    
    const selectedVariant = process.env.REPLICATE_SHADOW_MODEL_VARIANT || "sd_inpaint";
    const allowLamaOomFallback = (process.env.REPLICATE_SHADOW_FALLBACK_ON_OOM || "1") !== "0";
    const lamaMaxSide = Math.max(512, Number(process.env.REPLICATE_SHADOW_LAMA_MAX_SIDE || "1600") || 1600);
    const maskInput = maskDataUrl || kieMaskDataUrl;
    let modelToRun = model;
    let input: Record<string, any>;
    const sdxlModel = process.env.REPLICATE_SHADOW_MODEL_RUN_SDXL || "lucataco/sdxl-inpainting";
    const sdxlScheduler = process.env.REPLICATE_SHADOW_SDXL_SCHEDULER || "K_EULER";
    const sdxlSteps = Math.max(1, Math.min(80, Number(process.env.REPLICATE_SHADOW_SDXL_STEPS || "20") || 20));
    const sdxlGuidance = Math.max(0, Math.min(10, Number(process.env.REPLICATE_SHADOW_SDXL_GUIDANCE_SCALE || "8") || 8));
    const sdxlStrength = Math.max(0.01, Math.min(1, Number(process.env.REPLICATE_SHADOW_SDXL_STRENGTH || "0.75") || 0.75));
    const sdSteps = Math.max(1, Math.min(80, Number(process.env.REPLICATE_SHADOW_SD_STEPS || "30") || 30));
    const sdGuidance = Math.max(0, Math.min(20, Number(process.env.REPLICATE_SHADOW_SD_GUIDANCE_SCALE || "7.5") || 7.5));
    const sdStrength = Math.max(0.01, Math.min(1, Number(process.env.REPLICATE_SHADOW_SD_STRENGTH || "0.78") || 0.78));
    const sdTwoPass = (process.env.REPLICATE_SHADOW_SD_TWO_PASS || "1") !== "0";
    const sdPass1Steps = Math.max(1, Math.min(80, Number(process.env.REPLICATE_SHADOW_SD_PASS1_STEPS || "24") || 24));
    const sdPass1Guidance = Math.max(0, Math.min(20, Number(process.env.REPLICATE_SHADOW_SD_PASS1_GUIDANCE_SCALE || "4.8") || 4.8));
    const sdPass1Strength = Math.max(0.01, Math.min(1, Number(process.env.REPLICATE_SHADOW_SD_PASS1_STRENGTH || "0.72") || 0.72));
    const sdInput = {
      prompt: sdPrompt,
      negative_prompt: sdNegativePrompt,
      image: imageDataUrl,
      mask: maskInput,
      num_inference_steps: sdSteps,
      guidance_scale: sdGuidance,
      strength: sdStrength
    };

    if (selectedVariant === "lama") {
      if (!resizedForLama) {
        return Response.json({
          need_client_resize: true,
          maxSide: lamaMaxSide,
          status: 200
        });
      }
      modelToRun = process.env.REPLICATE_SHADOW_MODEL_RUN_LAMA || "allenhooo/lama";
      input = {
        image: imageDataUrl,
        mask: maskInput
      };
    } else if (selectedVariant === "sdxl_inpaint") {
      modelToRun = sdxlModel;
      input = {
        prompt: prompt,
        negative_prompt: negative_prompt,
        image: imageDataUrl,
        mask: maskInput,
        scheduler: sdxlScheduler,
        guidance_scale: sdxlGuidance,
        steps: sdxlSteps,
        strength: sdxlStrength,
        num_outputs: 1
      };
    } else {
      input = sdInput;
    }

    if (selectedVariant !== "sd_inpaint" && !modelToRun.includes(":")) {
      const token = process.env.REPLICATE_API_TOKEN;
      if (!token) {
        return Response.json({ msg: "Missing REPLICATE_API_TOKEN.", status: 500 });
      }
      try {
        const modelInfoRes = await fetch(`https://api.replicate.com/v1/models/${modelToRun}`, {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json"
          }
        });
        if (modelInfoRes.ok) {
          const modelInfo = await modelInfoRes.json();
          const latestVersionId = modelInfo?.latest_version?.id;
          if (latestVersionId) {
            modelToRun = `${modelToRun}:${latestVersionId}`;
          }
        }
      } catch (resolveErr) {
        console.warn("Failed to resolve LaMa model version, fallback to configured slug.", resolveErr);
      }
    }

    console.log(`Running Replicate model: ${modelToRun}`);
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const isRateLimitError = (errText: string) => {
      return errText.includes("status 429") || errText.includes('"status":429') || errText.includes("Too Many Requests") || errText.includes("throttled");
    };
    const parseRetryAfterMs = (errText: string) => {
      const retrySec = Number(errText.match(/"retry_after"\s*:\s*(\d+)/)?.[1] || "1");
      return Math.max(1000, retrySec * 1000);
    };
    const runReplicateWithRetry = async (runInput: Record<string, any>, maxAttempts = 3) => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          return await replicate.run(modelToRun as any, { input: runInput });
        } catch (err) {
          const errText = String(err || "");
          if (!isRateLimitError(errText) || attempt === maxAttempts - 1) {
            throw err;
          }
          const waitMs = parseRetryAfterMs(errText) + attempt * 600;
          await sleep(waitMs);
        }
      }
      throw new Error("Replicate retry failed.");
    };
    
    let output;
    try {
      if (selectedVariant === "sd_inpaint" && sdTwoPass) {
        const pass1Input = {
          ...sdInput,
          num_inference_steps: sdPass1Steps,
          guidance_scale: sdPass1Guidance,
          strength: sdPass1Strength
        };
        const pass1Output = await runReplicateWithRetry(pass1Input);
        const pass1Url = Array.isArray(pass1Output) ? pass1Output[0] : pass1Output;
        if (!pass1Url) {
          throw new Error("Pass1 returned empty output.");
        }
        const pass2Input = {
          ...sdInput,
          image: pass1Url,
          num_inference_steps: sdSteps,
          guidance_scale: sdGuidance,
          strength: sdStrength
        };
        try {
          output = await runReplicateWithRetry(pass2Input);
        } catch (pass2Err) {
          const pass2Text = String(pass2Err || "");
          if (isRateLimitError(pass2Text)) {
            output = pass1Output;
          } else {
            throw pass2Err;
          }
        }
      } else {
        output = await runReplicateWithRetry(input);
      }
    } catch (runErr) {
      const errText = String(runErr || "");
      const isLamaOom = selectedVariant === "lama" && (
        errText.includes("CUDA out of memory") ||
        errText.includes("out of memory")
      );
      if (selectedVariant === "lama" && String(runErr).includes("could not be found") && !modelToRun.includes(":")) {
        return Response.json({
          msg: "LaMa model slug not found. Set REPLICATE_SHADOW_MODEL_RUN_LAMA to a versioned id like owner/model:version.",
          error: String(runErr),
          status: 500
        });
      }
      if (isLamaOom && allowLamaOomFallback) {
        output = await runReplicateWithRetry(sdInput);
      } else {
        throw runErr;
      }
    }
    // Stable Diffusion Inpainting usually returns an array of image URLs
    const outputUrl = Array.isArray(output) ? output[0] : output;

    if (!outputUrl) {
      return Response.json({ msg: "Model returned empty output.", status: 500 });
    }

    return new Response(JSON.stringify({ output_url: outputUrl }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (err) {
    console.error("AI refine failed:", err);
    return Response.json({ msg: "AI refine failed.", error: String(err), status: 500 });
  }
}
