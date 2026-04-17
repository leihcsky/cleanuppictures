import crypto from "crypto";
import { getDb, withDbTransaction, type DbClient } from "~/libs/db";
import { getCreditsByProductId } from "~/configs/billingPolicy";

type CreemWebhookEvent = {
  id?: string;
  eventType?: string;
  object?: any;
  created_at?: number;
};

function randomOrderNoSuffix(length: number) {
  const raw = crypto.randomBytes(Math.max(4, Math.ceil(length / 2))).toString("hex").toUpperCase();
  return raw.slice(0, length);
}

export function createOrderNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `CP${y}${m}${d}${randomOrderNoSuffix(8)}`;
}

/** Creem subscription id for API cancel; never use checkout id here. */
export function resolveCreemSubscriptionId(payload: any): string {
  if (!payload) return "";
  const nested = payload.subscription;
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  if (nested && typeof nested === "object" && nested.id) return String(nested.id);
  const objectType = String(payload.object || "").toLowerCase();
  if ((objectType === "subscription" || objectType === "customer_subscription") && payload.id) {
    return String(payload.id);
  }
  return "";
}

export async function hydrateOrderFromCreemSuccessRedirect(params: {
  checkoutId?: string | null;
  orderId?: string | null;
  customerId?: string | null;
  productId?: string | null;
}) {
  const db = getDb();
  const checkoutId = String(params.checkoutId || "");
  if (!checkoutId) return;
  await db.query(
    "update orders set provider_payment_id=coalesce(provider_payment_id,$1),provider_customer_id=coalesce(provider_customer_id,$2),product_sku=coalesce(product_sku,$3),updated_at=now() where provider=$4 and provider_checkout_id=$5",
    [params.orderId || null, params.customerId || null, params.productId || null, "creem", checkoutId]
  );
}

export function verifyCreemWebhookSignature(payload: string, signature: string, webhookSecret: string) {
  const computed = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(String(signature || ""), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function verifyCreemRedirectSignature(
  params: Record<string, string | null | undefined>,
  apiKey: string
) {
  const sortedParams = Object.keys(params)
    .filter((key) => key !== "signature" && params[key] !== null && params[key] !== undefined && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const expected = crypto.createHmac("sha256", apiKey).update(sortedParams).digest("hex");
  return expected === String(params.signature || "");
}

async function ensureCreditsRow(tx: DbClient, userId: number) {
  const rowRes = await tx.query("select user_id from credits where user_id=$1 limit 1", [userId]);
  if (rowRes.rows.length <= 0) {
    await tx.query("insert into credits(user_id,balance) values($1,$2)", [userId, 0]);
  }
}

function parseInternalUserId(webhookObject: any): number {
  const m1 = Number(webhookObject?.metadata?.userId || 0);
  if (m1 > 0) return m1;
  const m2 = Number(webhookObject?.subscription?.metadata?.userId || 0);
  if (m2 > 0) return m2;
  const ref = String(webhookObject?.request_id || webhookObject?.checkout?.request_id || "");
  const match = ref.match(/^u(\d+)_/);
  if (match?.[1]) return Number(match[1]);
  return 0;
}

async function upsertSubscriptionFromWebhook(
  tx: DbClient,
  userId: number,
  webhookObject: any,
  statusOverride?: string,
  allowInsert: boolean = true
) {
  const sub = webhookObject?.subscription || webhookObject;
  const providerSubscriptionId = resolveCreemSubscriptionId(webhookObject);
  const product = sub?.product;
  const productId = typeof product === "string" ? product : String(product?.id || "");
  const mapped = getCreditsByProductId(productId);
  const creditsPerMonth = mapped?.kind === "pro" ? mapped.credits : 0;
  const plan = mapped?.kind === "pro" ? "pro_monthly" : (productId || "subscription");
  const status = statusOverride || String(sub?.status || "active");
  const startDate = sub?.current_period_start_date ? new Date(sub.current_period_start_date) : null;
  const endDate = sub?.current_period_end_date ? new Date(sub.current_period_end_date) : null;

  const latest = await tx.query("select id from subscriptions where user_id=$1 order by id desc limit 1", [userId]);
  if (latest.rows.length > 0) {
    await tx.query(
      "update subscriptions set provider=$1,provider_subscription_id=coalesce($2,provider_subscription_id),plan=$3,credits_per_month=$4,start_date=$5,end_date=$6,status=$7 where id=$8",
      ["creem", providerSubscriptionId || null, plan, creditsPerMonth, startDate, endDate, status, latest.rows[0].id]
    );
    return Number(latest.rows[0].id || 0);
  }
  if (!allowInsert) {
    return 0;
  }
  await tx.query(
    "insert into subscriptions(user_id,provider,provider_subscription_id,plan,credits_per_month,start_date,end_date,status) values($1,$2,$3,$4,$5,$6,$7,$8)",
    [userId, "creem", providerSubscriptionId || null, plan, creditsPerMonth, startDate, endDate, status]
  );
  const inserted = await tx.query("select id from subscriptions where user_id=$1 order by id desc limit 1", [userId]);
  return Number(inserted.rows?.[0]?.id || 0);
}

async function settleOrderAndGrantCredits(tx: DbClient, args: {
  userId: number;
  productId: string;
  orderId: string;
  checkoutId: string;
  customerId: string;
  amountCents: number;
  currency: string;
  requestId: string;
  orderType: "recurring" | "one_time";
}) {
  const mapped = getCreditsByProductId(args.productId);
  if (!mapped) return;

  let orderRes = args.checkoutId
    ? await tx.query("select * from orders where provider=$1 and provider_checkout_id=$2 limit 1", ["creem", args.checkoutId])
    : { rows: [] as any[] };
  if (orderRes.rows.length <= 0 && args.orderType === "recurring") {
    orderRes = await tx.query(
      "select * from orders where provider=$1 and user_id=$2 and order_kind=$3 and product_sku=$4 and status=$5 order by id desc limit 1",
      ["creem", args.userId, "subscription", args.productId, "pending"]
    );
  }
  if (orderRes.rows.length <= 0 && args.orderId) {
    orderRes = await tx.query("select * from orders where provider=$1 and provider_payment_id=$2 limit 1", ["creem", args.orderId]);
  }
  let localOrder = orderRes.rows?.[0];
  if (!localOrder) {
    const amountUsd = Number(args.amountCents || 0) / 100;
    const orderNo = createOrderNo();
    await tx.query(
      "insert into orders(order_no,user_id,amount,credits,currency,product_sku,order_kind,status,provider,provider_checkout_id,provider_payment_id,provider_customer_id,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),now())",
      [
        orderNo,
        args.userId,
        amountUsd,
        mapped.credits,
        args.currency || "USD",
        args.productId,
        mapped.kind === "pro" ? "subscription" : "credit_pack",
        "pending",
        "creem",
        args.checkoutId || null,
        args.orderId || null,
        args.customerId || null
      ]
    );
    const inserted = await tx.query("select * from orders where order_no=$1 limit 1", [orderNo]);
    localOrder = inserted.rows?.[0];
  }
  if (!localOrder) return;
  const localOrderId = Number(localOrder.id || 0);
  const currentStatus = String(localOrder.status || "").toLowerCase();
  if (currentStatus === "paid") return;

  await ensureCreditsRow(tx, args.userId);
  await tx.query(
    "update orders set status=$1,provider_payment_id=coalesce(provider_payment_id,$2),provider_customer_id=coalesce(provider_customer_id,$3),amount=coalesce(amount,$4),currency=coalesce(currency,$5),updated_at=now() where id=$6",
    ["paid", args.orderId || null, args.customerId || null, Number(args.amountCents || 0) / 100, args.currency || "USD", localOrderId]
  );
  await tx.query("update credits set balance=balance+$1, updated_at=now() where user_id=$2", [mapped.credits, args.userId]);
  await tx.query(
    "insert into credit_buckets(user_id,order_id,source_type,granted_credits,remaining_credits,status,external_payment_ref) values($1,$2,$3,$4,$5,$6,$7)",
    [args.userId, localOrderId || null, mapped.kind === "pro" ? "subscription_grant" : "purchase_pack", mapped.credits, mapped.credits, "active", args.orderId]
  );
  const bucketRes = await tx.query("select id from credit_buckets where user_id=$1 order by id desc limit 1", [args.userId]);
  const bucketId = Number(bucketRes.rows?.[0]?.id || 0);
  await tx.query(
    "insert into credit_transactions(user_id,amount,type,reference_id,bucket_id) values($1,$2,$3,$4,$5)",
    [args.userId, mapped.credits, mapped.kind === "pro" ? "grant_bucket" : "purchase", localOrderId || null, bucketId || null]
  );

  // Subscription row lifecycle is handled by webhook status upsert.
}

async function handleRefundCreatedWebhook(obj: any) {
  const db = getDb();
  const providerOrderId = String(obj?.order?.id || obj?.transaction?.order || "");
  if (!providerOrderId) {
    return { ok: true, ignored: true, reason: "missing-provider-order-id" };
  }

  await withDbTransaction(async (tx) => {
    const orderRes = await tx.query(
      "select id,user_id,status from orders where provider=$1 and (provider_payment_id=$2 or provider_checkout_id=$3) limit 1",
      ["creem", providerOrderId, String(obj?.checkout?.id || "")]
    );
    if (orderRes.rows.length <= 0) return;
    const localOrder = orderRes.rows[0];
    const localOrderId = Number(localOrder.id || 0);
    const userId = Number(localOrder.user_id || 0);
    const status = String(localOrder.status || "").toLowerCase();

    // Idempotent: already refunded.
    if (status === "refunded") return;

    const bucketsRes = await tx.query(
      "select id,remaining_credits,status from credit_buckets where order_id=$1",
      [localOrderId]
    );
    let refundable = 0;
    for (const row of bucketsRes.rows || []) {
      const remaining = Number(row.remaining_credits || 0);
      const bucketStatus = String(row.status || "").toLowerCase();
      if (remaining > 0 && bucketStatus !== "refunded") {
        refundable += remaining;
      }
    }

    await tx.query(
      "update credit_buckets set remaining_credits=0,status=$1,refund_requested_at=coalesce(refund_requested_at,now()),refunded_at=now(),updated_at=now() where order_id=$2 and status <> $3",
      ["refunded", localOrderId, "refunded"]
    );
    await tx.query("update orders set status=$1,refunded_at=now(),updated_at=now() where id=$2", ["refunded", localOrderId]);

    if (userId > 0 && refundable > 0) {
      await ensureCreditsRow(tx, userId);
      await tx.query("update credits set balance=GREATEST(balance-$1,0),updated_at=now() where user_id=$2", [refundable, userId]);
      await tx.query(
        "insert into credit_transactions(user_id,amount,type,reference_id,bucket_id) values($1,$2,$3,$4,$5)",
        [userId, -refundable, "refund_bucket", localOrderId, null]
      );
    }
  });

  return { ok: true };
}

export async function handleCreemWebhookEvent(event: CreemWebhookEvent) {
  const eventType = String(event?.eventType || "");
  const obj = event?.object || {};
  if (eventType === "refund.created") {
    return handleRefundCreatedWebhook(obj);
  }

  const userId = parseInternalUserId(obj);
  if (!userId) return { ok: true, ignored: true, reason: "missing-user" };

  const db = getDb();
  const userRes = await db.query("select id from users where id=$1 limit 1", [userId]);
  if (userRes.rows.length <= 0) return { ok: true, ignored: true, reason: "user-not-found" };

  if (eventType === "checkout.completed") {
    const order = obj?.order || {};
    const productId = String(order?.product || obj?.product?.id || obj?.product || "");
    const orderType = String(order?.type || obj?.product?.billing_type || "one_time") === "recurring" ? "recurring" : "one_time";
    await withDbTransaction(async (tx) => {
      if (orderType !== "recurring") {
        await settleOrderAndGrantCredits(tx, {
          userId,
          productId,
          orderId: String(order?.id || ""),
          checkoutId: String(obj?.id || ""),
          customerId: String(order?.customer || obj?.customer?.id || ""),
          amountCents: Number(order?.amount_paid || order?.amount || 0),
          currency: String(order?.currency || obj?.product?.currency || "USD"),
          requestId: String(obj?.request_id || ""),
          orderType
        });
      } else {
        await upsertSubscriptionFromWebhook(tx, userId, obj, "active");
      }
    });
    return { ok: true };
  }

  if (eventType === "subscription.paid") {
    const sub = obj || {};
    const productId = String(sub?.product?.id || sub?.product || "");
    await withDbTransaction(async (tx) => {
      await settleOrderAndGrantCredits(tx, {
        userId,
        productId,
        orderId: String(sub?.last_transaction_id || ""),
        checkoutId: String(sub?.id || ""),
        customerId: String(sub?.customer?.id || sub?.customer || ""),
        amountCents: Number(sub?.product?.price || 0),
        currency: String(sub?.product?.currency || "USD"),
        requestId: String(sub?.id || ""),
        orderType: "recurring"
      });
      await upsertSubscriptionFromWebhook(tx, userId, sub, String(sub?.status || "active"));
    });
    return { ok: true };
  }

  if (
    eventType === "subscription.active" ||
    eventType === "subscription.update" ||
    eventType === "subscription.trialing" ||
    eventType === "subscription.scheduled_cancel" ||
    eventType === "subscription.past_due" ||
    eventType === "subscription.expired" ||
    eventType === "subscription.paused" ||
    eventType === "subscription.canceled"
  ) {
    await withDbTransaction(async (tx) => {
      await upsertSubscriptionFromWebhook(tx, userId, obj, String(obj?.status || "").toLowerCase(), false);
    });
    return { ok: true };
  }

  return { ok: true, ignored: true, reason: "event-not-handled" };
}

