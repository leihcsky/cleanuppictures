import { NextRequest, NextResponse } from "next/server";
import { moderateImageDataUrl } from "~/libs/imageModeration";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ msg: "Invalid JSON body.", allowed: false }, { status: 400 });
  }
  const imageDataUrl = (body as { imageDataUrl?: unknown })?.imageDataUrl;
  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ msg: "Expected imageDataUrl (data URL).", allowed: false }, { status: 400 });
  }

  const result = await moderateImageDataUrl(imageDataUrl);
  if (result.allowed === true) {
    return NextResponse.json({
      allowed: true,
      skipped: result.skipped,
      warning: result.warning
    });
  }
  if (result.flagged) {
    return NextResponse.json(
      {
        allowed: false,
        flagged: true,
        message: result.message || "This image did not pass content guidelines."
      },
      { status: 403 }
    );
  }
  return NextResponse.json(
    {
      allowed: false,
      flagged: false,
      message: result.message || "Request could not be completed."
    },
    { status: 422 }
  );
}
