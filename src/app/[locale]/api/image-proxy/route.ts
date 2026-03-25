export async function GET(req: Request) {
  const query = new URL(req.url).searchParams;
  const rawUrl = query.get("url");
  if (!rawUrl) {
    return Response.json({ msg: "Missing url.", status: 400 }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return Response.json({ msg: "Invalid url.", status: 400 }, { status: 400 });
  }

  if (target.protocol !== "https:") {
    return Response.json({ msg: "Only https is allowed.", status: 400 }, { status: 400 });
  }

  const allowlist = (process.env.SAMPLE_IMAGE_PROXY_ALLOWLIST || "r2.dev")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const host = target.hostname.toLowerCase();
  const allowed = allowlist.some((item) => host === item || host.endsWith(`.${item}`));
  if (!allowed) {
    return Response.json({ msg: "Host not allowed.", status: 403 }, { status: 403 });
  }

  const upstream = await fetch(target.toString(), {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
    }
  });
  if (!upstream.ok) {
    return Response.json({ msg: "Failed to fetch image.", status: upstream.status }, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400"
    }
  });
}
