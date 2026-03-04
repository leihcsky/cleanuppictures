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
    const { imageDataUrl, maskDataUrl, kieMaskDataUrl, scene } = json;

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return Response.json({ msg: "Invalid image input.", status: 400 });
    }

    // Check for KIE API Key first
    const kieApiKey = process.env.KIE_API_KEY;
    
    // Refined prompts for different removal tasks
    // User suggestion: "Fill in the masked area to match the background seamlessly. Do not alter anything outside the selected area. Preserve original lighting, texture, and color. Make the result realistic and natural"
    // Base prompts - focused on pure removal and background restoration
    // Key change: Focused on "lighting correction" rather than "removal" to guide the model to lighten the area.
    const basePrompt = "Natural lighting. Consistent background texture. Seamless blending. Match surrounding colors and brightness. High quality, realistic.";
    let prompt = basePrompt;
    
    // Negative prompts - explicitly forbid common hallucinations
    // Added "vibrant colors, strong colors" to prevent red/blue artifacts.
    let negative_prompt = "red, blue, green, vibrant colors, strong colors, shadow, occlusion, dark spots, low quality, artifacts, blur, distortion, unnatural, duplicate objects, distorted face, deformed body, changed subject, mutation, bad anatomy, ugly, extra limbs, new colors, colored patches, painting, drawing, illustration, watermark, text, signature, new objects, car, vehicle, wheel, transportation, animal, person, human, furniture";

    if (scene) {
      switch (scene) {
        case 'building':
          prompt = "Architectural details. Consistent lighting. Seamless blending. Match surrounding texture. Realistic, natural, high quality.";
          break;
        case 'portrait':
          prompt = "Clean skin. Natural skin texture. Soft lighting. Match skin tone seamlessly. Realistic, high quality. Do not alter facial features.";
          break;
        case 'object':
          prompt = "Studio lighting. Consistent surface texture. Seamless blending. Match background colors. Realistic, product photography, high quality.";
          break;
        case 'text':
          prompt = "Remove text and shadow, clean background, seamless pattern. Preserve original lighting and texture. High quality.";
          break;
        case 'person':
          // Focus on what to replace the shadow WITH: clean ground, natural light.
          // Avoiding "preserve person" instructions as they might confuse the model about the masked area.
          prompt = "Clean ground surface, natural lighting, seamless blending with surroundings. High resolution, 8k. No shadows, no dark spots.";
          break;
        default:
          prompt = `${basePrompt}`;
      }
    }

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
    
    const input = {
      prompt: prompt,
      negative_prompt: negative_prompt,
      image: imageDataUrl,
      mask: maskDataUrl || kieMaskDataUrl, 
      num_inference_steps: 50, 
      guidance_scale: 4.5, // Reduced from 7.5 to 4.5 to avoid color artifacts (red/blue) and over-interpretation
      strength: 1.0            
    };

    console.log(`Running Replicate model: ${model}`);
    
    const output = await replicate.run(model as any, { input });
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
