import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { moderateImageDataUrl } from "~/libs/imageModeration";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const traceId = randomUUID();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    console.warn(
      "[moderation:image]",
      JSON.stringify({ event: "invalid_json", trace_id: traceId, path: "editor_gate" })
    );
    return NextResponse.json({ msg: "Invalid JSON body.", allowed: false, trace_id: traceId }, { status: 400 });
  }
  const clientRequestId = (body as { client_request_id?: unknown })?.client_request_id;
  const clientRequestIdStr = typeof clientRequestId === "string" ? clientRequestId : undefined;
  const imageDataUrl = (body as { imageDataUrl?: unknown })?.imageDataUrl;
  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
    console.warn(
      "[moderation:image]",
      JSON.stringify({
        event: "invalid_body",
        trace_id: traceId,
        client_request_id: clientRequestIdStr ?? null,
        path: "editor_gate"
      })
    );
    return NextResponse.json(
      { msg: "Expected imageDataUrl (data URL).", allowed: false, trace_id: traceId },
      { status: 400 }
    );
  }

  console.info(
    "[moderation:image]",
    JSON.stringify({
      event: "request_received",
      trace_id: traceId,
      client_request_id: clientRequestIdStr ?? null,
      path: "editor_gate"
    })
  );

  const result = await moderateImageDataUrl(imageDataUrl, { traceId, stage: "editor_gate" });
  if (result.allowed === true) {
    console.info(
      "[moderation:image]",
      JSON.stringify({
        event: "allowed",
        trace_id: traceId,
        client_request_id: clientRequestIdStr ?? null,
        path: "editor_gate",
        skipped: Boolean(result.skipped),
        warning: result.warning ?? null
      })
    );
    return NextResponse.json({
      allowed: true,
      skipped: result.skipped,
      warning: result.warning,
      trace_id: traceId
    });
  }
  if (result.flagged) {
    console.warn(
      "[moderation:image]",
      JSON.stringify({
        event: "blocked_flagged",
        trace_id: traceId,
        client_request_id: clientRequestIdStr ?? null,
        path: "editor_gate",
        message: result.message || null
      })
    );
    return NextResponse.json(
      {
        allowed: false,
        flagged: true,
        message: result.message || "This image did not pass content guidelines.",
        trace_id: traceId
      },
      { status: 403 }
    );
  }
  console.warn(
    "[moderation:image]",
    JSON.stringify({
      event: "rejected_or_screening_failed",
      trace_id: traceId,
      client_request_id: clientRequestIdStr ?? null,
      path: "editor_gate",
      message: result.message || null
    })
  );
  return NextResponse.json(
    {
      allowed: false,
      flagged: false,
      message: result.message || "Request could not be completed.",
      trace_id: traceId
    },
    { status: 422 }
  );
}
