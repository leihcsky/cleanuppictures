
import { getReplicateClient } from "~/libs/replicateClient";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { imageDataUrl, maskDataUrl, scene } = json;

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return Response.json({ msg: "Invalid image input.", status: 400 });
    }

    const modelRun = process.env.REPLICATE_SHADOW_MODEL_RUN;
    
    if (!modelRun) {
      console.error("REPLICATE_SHADOW_MODEL_RUN is not set");
      return Response.json({ msg: "Shadow model not configured.", status: 500 });
    }

    const replicate = getReplicateClient();
    
    // Select prompt based on scene
    let prompt = "remove shadow, clean background, natural lighting, high quality";
    let negative_prompt = "shadow, dark, artifacts, blur, low quality";

    if (scene === 'building') {
        prompt = "remove shadow from building facade, architectural photography, even lighting, clean wall, high quality";
        negative_prompt = "shadow, dark, artifacts, blur, low quality, distorted structure";
    } else if (scene === 'portrait') {
        prompt = "remove shadow from face, soft studio lighting, natural skin tone, high quality, professional portrait";
        negative_prompt = "shadow, dark, artifacts, blur, low quality, unnatural skin, distorted face";
    } else if (scene === 'object') {
        prompt = "remove shadow, product photography, white studio lighting, clean background, high quality";
        negative_prompt = "shadow, dark, artifacts, blur, low quality, noise";
    }

    // Prepare input for Replicate
    // For stable-diffusion-inpainting, we need 'prompt' and 'mask'
    const input: any = {
      image: imageDataUrl,
      prompt,
      negative_prompt,
    };

    if (maskDataUrl && typeof maskDataUrl === "string") {
      input.mask = maskDataUrl;
    } else {
       // If no mask is provided, some models might fail or just process the whole image.
       // For SD Inpainting, mask is usually required. 
       // We can return an error or let it fail.
       // But let's log a warning.
       console.warn("No mask provided for shadow removal. This might fail for inpainting models.");
    }

    console.log(`Running Replicate model: ${modelRun}`);
    
    const output = await replicate.run(modelRun as any, {
      input
    });

    console.log("Replicate output:", output);

    let outputUrl = "";
    if (Array.isArray(output) && output.length > 0) {
      outputUrl = output[0];
    } else if (typeof output === "string") {
      outputUrl = output;
    } else if (typeof output === "object" && (output as any)?.output) {
      outputUrl = (output as any).output;
    }

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
