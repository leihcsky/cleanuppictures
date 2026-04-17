import { handleCreemWebhookEvent, verifyCreemWebhookSignature } from "~/servers/creemBilling";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("creem-signature") || "";
  const webhookSecret = process.env.CREEM_WEBHOOK_SECRET || "";
  if (!webhookSecret) {
    return new Response("Missing CREEM_WEBHOOK_SECRET", { status: 500 });
  }
  if (!signature || !verifyCreemWebhookSignature(rawBody, signature, webhookSecret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    await handleCreemWebhookEvent(payload);
    return Response.json({ received: true });
  } catch (e) {
    console.error("Creem webhook handler failed:", e);
    return new Response("Webhook handler failed", { status: 500 });
  }
}

