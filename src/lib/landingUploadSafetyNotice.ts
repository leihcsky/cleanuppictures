/** One-line hint for home editor, marketing landings, and upload cards. */
export function getUploadSafetyShortLine(locale: string): string {
  return locale === "zh" ? "上传内容将自动进行安全审核。" : "Uploads are automatically reviewed for safety.";
}
