/**
 * Map raw Replicate / model errors to short, actionable copy for end users.
 * Keep patterns lowercase for matching.
 */
export function getUserFacingAiErrorMessage(rawError: string, locale: "en" | "zh"): string {
  const t = String(rawError || "").toLowerCase();

  const isZh = locale === "zh";

  if (t.includes("prediction interrupted") || t.includes("code: pa")) {
    return isZh
      ? "AI 处理被中断（常见于服务繁忙、图片过大或单次耗时过长）。请稍后重试；若多次失败，可尝试稍小的图片或缩小涂抹区域。"
      : "The AI run was interrupted—often due to busy servers, a very large image, or a long job. Please try again. If it keeps failing, use a smaller image or paint a smaller area.";
  }

  if (
    t.includes("out of memory") ||
    t.includes("cuda out of memory") ||
    t.includes("oom") && (t.includes("memory") || t.includes("gpu"))
  ) {
    return isZh
      ? "当前图片对 AI 模型来说过大，处理失败。请使用尺寸更小的图片，或在编辑前适当裁切。"
      : "This image is too large for the AI model to process. Try a smaller photo or crop before editing.";
  }

  if (
    t.includes("429") ||
    t.includes("too many requests") ||
    t.includes("throttl") ||
    t.includes("rate limit")
  ) {
    return isZh
      ? "请求过于频繁，请稍等片刻后再试。"
      : "Too many requests right now. Please wait a moment and try again.";
  }

  if (t.includes("timeout") || t.includes("timed out") || t.includes("etimedout")) {
    return isZh
      ? "处理超时。请稍后重试；若图片很大，可先缩小尺寸再试。"
      : "The request timed out. Try again in a moment, or use a smaller image.";
  }

  if (t.includes("could not be found") && t.includes("model")) {
    return isZh
      ? "模型配置异常，请稍后再试或联系支持。"
      : "The AI model could not be loaded. Please try again later or contact support.";
  }

  if (t.includes("invalid") && (t.includes("mask") || t.includes("image"))) {
    return isZh
      ? "图片或蒙版数据无效。请重新涂抹后重试。"
      : "The image or mask data was invalid. Paint the area again and retry.";
  }

  return isZh
    ? "处理失败。请稍后重试；若持续失败，可尝试缩小图片、换一张图或联系支持。"
    : "Something went wrong while processing. Please try again. If it keeps happening, try a smaller image or contact support.";
}

export function resolveAiErrorLocale(raw: unknown): "en" | "zh" {
  const s = String(raw || "").toLowerCase();
  return s.startsWith("zh") ? "zh" : "en";
}
