export type ClientModerationOutcome =
  | { ok: true }
  | { ok: false; kind: "flagged" | "rejected" | "network"; message?: string };

function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * POST /{locale}/api/moderation/image — returns whether the image may be loaded in the editor.
 * Logs correlation ids only (no image content).
 */
export async function requestClientImageModeration(locale: string, imageDataUrl: string): Promise<ClientModerationOutcome> {
  const clientRequestId = newClientRequestId();
  console.info(
    "[moderation:client] editor_gate_request",
    JSON.stringify({
      client_request_id: clientRequestId,
      locale,
      data_url_length_chars: imageDataUrl.length
    })
  );

  try {
    const res = await fetch(`/${locale}/api/moderation/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl, client_request_id: clientRequestId })
    });
    const data = (await res.json().catch(() => null)) as {
      allowed?: boolean;
      flagged?: boolean;
      message?: string;
      msg?: string;
      trace_id?: string;
    } | null;

    console.info(
      "[moderation:client] editor_gate_response",
      JSON.stringify({
        client_request_id: clientRequestId,
        http_status: res.status,
        server_trace_id: data?.trace_id ?? null,
        allowed: data?.allowed ?? null,
        flagged: data?.flagged ?? null
      })
    );

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
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "fetch_failed";
    console.warn(
      "[moderation:client] editor_gate_fetch_error",
      JSON.stringify({ client_request_id: clientRequestId, message: errMsg })
    );
    return { ok: false, kind: "network", message: "Network error while checking the image." };
  }
}
