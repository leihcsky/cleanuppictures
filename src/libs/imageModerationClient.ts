export type ClientModerationOutcome =
  | { ok: true }
  | { ok: false; kind: "flagged" | "rejected" | "network"; message?: string };

/**
 * POST /{locale}/api/moderation/image — returns whether the image may be loaded in the editor.
 */
export async function requestClientImageModeration(locale: string, imageDataUrl: string): Promise<ClientModerationOutcome> {
  try {
    const res = await fetch(`/${locale}/api/moderation/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl })
    });
    const data = (await res.json().catch(() => null)) as {
      allowed?: boolean;
      flagged?: boolean;
      message?: string;
      msg?: string;
    } | null;
    if (!data) {
      return { ok: false, kind: "network", message: "Invalid response from server." };
    }
    if (res.status === 403 && data.flagged) {
      return { ok: false, kind: "flagged", message: data.message || data.msg };
    }
    if (data.allowed) {
      return { ok: true };
    }
    return {
      ok: false,
      kind: "rejected",
      message: data.message || data.msg || "This image could not be accepted."
    };
  } catch {
    return { ok: false, kind: "network", message: "Network error while checking the image." };
  }
}
