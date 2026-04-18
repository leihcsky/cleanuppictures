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

  const allowlist = (process.env.SAMPLE_IMAGE_PROXY_ALLOWLIST || "r2.dev,cleanuppictures.org")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const host = target.hostname.toLowerCase();
  const allowed = allowlist.some((item) => host === item || host.endsWith(`.${item}`));
  if (!allowed) {
    return Response.json({ msg: "Host not allowed.", status: 403 }, { status: 403 });
  }

  const fetchUpstream = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      return await fetch(target.toString(), {
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let upstream: Response | null = null;
  let lastErr: unknown = null;
  const retries = [0, 250, 800];
  for (const delay of retries) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    try {
      upstream = await fetchUpstream();
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!upstream) {
    console.error("image-proxy upstream fetch failed:", lastErr);
    return Response.json({ msg: "Image source temporarily unavailable. Please retry.", status: 502 }, { status: 502 });
  }
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
