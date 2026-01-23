import { getReplicateClient } from "~/libs/replicateClient";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const imageDataUrl = json?.imageDataUrl as string;
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return Response.json({ msg: "Invalid image input.", status: 400 });
    }

    const modelRun = process.env.REPLICATE_SHADOW_MODEL_RUN;
    if (!modelRun) {
      return Response.json({ msg: "Shadow model not configured.", status: 500 });
    }

    const replicate = getReplicateClient();
    const output: any = await replicate.run(modelRun, {
      input: { image: imageDataUrl }
    });

    let outputUrl = "";
    if (Array.isArray(output)) {
      outputUrl = output[0];
    } else if (typeof output === "string") {
      outputUrl = output;
    } else if (output?.output) {
      outputUrl = output.output;
    }

    if (!outputUrl) {
      return Response.json({ msg: "Model returned empty output.", status: 500 });
    }

    return new Response(JSON.stringify({ output_url: outputUrl }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (err) {
    return Response.json({ msg: "AI refine failed.", status: 500 });
  }
}
