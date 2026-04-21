import { getDb, getDbDialect } from "~/libs/db";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { getPaymentProvider } from "~/configs/billingPolicy";

/** Abandoned Creem checkouts: no payment id after this long → expired (list read triggers cleanup). */
const CREEM_PENDING_STALE_HOURS = 1;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = Number((token as any)?.user_id || 0);
  if (!userId) {
    return Response.json({ status: 0, orders: [] }, { status: 401 });
  }

  const db = getDb();

  if (getPaymentProvider() === "creem") {
    const cutoff = new Date(Date.now() - CREEM_PENDING_STALE_HOURS * 60 * 60 * 1000);
    await db.query(
      "update orders set status=$1,updated_at=now() where user_id=$2 and provider=$3 and status=$4 and (provider_payment_id is null or provider_payment_id='') and created_at < $5",
      ["expired", userId, "creem", "pending", cutoff]
    );
  }

  const res = await db.query(
    "select id,order_no,amount,credits,currency,product_sku,order_kind,status,provider,provider_checkout_id,provider_payment_id,created_at,updated_at,refunded_at,DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at_text,DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_text,DATE_FORMAT(refunded_at, '%Y-%m-%d %H:%i:%s') as refunded_at_text from orders where user_id=$1 order by id desc limit 100",
    [userId]
  );
  const rawRows = res.rows || [];
  const creditPackPaidIds = rawRows
    .filter((row: any) => String(row.status || "") === "paid" && String(row.order_kind || "credit_pack") === "credit_pack")
    .map((row: any) => Number(row.id || 0))
    .filter((id: number) => id > 0);

  const bucketByOrderId = new Map<number, { granted: number; remaining: number }>();
  if (creditPackPaidIds.length > 0) {
    const dialect = getDbDialect();
    if (dialect === "postgres") {
      const br = await db.query(
        "select order_id, coalesce(sum(granted_credits),0)::bigint as granted_total, coalesce(sum(remaining_credits),0)::bigint as remaining_total from credit_buckets where order_id = any($1::int[]) group by order_id",
        [creditPackPaidIds]
      );
      for (const b of br.rows || []) {
        bucketByOrderId.set(Number(b.order_id), {
          granted: Number(b.granted_total),
          remaining: Number(b.remaining_total)
        });
      }
    } else {
      const placeholders = creditPackPaidIds.map((_, i) => `$${i + 1}`).join(", ");
      const br = await db.query(
        `select order_id, coalesce(sum(granted_credits),0) as granted_total, coalesce(sum(remaining_credits),0) as remaining_total from credit_buckets where order_id in (${placeholders}) group by order_id`,
        creditPackPaidIds
      );
      for (const b of br.rows || []) {
        bucketByOrderId.set(Number(b.order_id), {
          granted: Number(b.granted_total),
          remaining: Number(b.remaining_total)
        });
      }
    }
  }

  const orders = rawRows.map((row: any) => {
    const status = String(row.status || "");
    const kind = String(row.order_kind || "credit_pack");
    const refundVisible = status === "paid" && kind === "credit_pack";
    let refund_eligible = false;
    let refund_block_key: string | null = null;
    if (refundVisible) {
      const createdAtTs = new Date(row.created_at || "").getTime();
      const nowTs = Date.now();
      const ageDays = Number.isFinite(createdAtTs) ? Math.floor((nowTs - createdAtTs) / (24 * 60 * 60 * 1000)) : 9999;
      if (ageDays > 7) {
        refund_block_key = "window_expired";
      } else {
        const b = bucketByOrderId.get(Number(row.id || 0));
        const gt = b?.granted ?? 0;
        const rt = b?.remaining ?? 0;
        if (gt <= 0) {
          refund_block_key = "no_bucket";
        } else if (rt < gt) {
          refund_block_key = "used_credits";
        } else {
          refund_eligible = true;
        }
      }
    }
    const canCancelSubscription = status === "paid" && kind === "subscription" && String(row.provider || "") === "creem";
    return {
      id: Number(row.id || 0),
      order_no: String(row.order_no || ""),
      amount: Number(row.amount || 0),
      credits: Number(row.credits || 0),
      currency: String(row.currency || "USD"),
      product_sku: String(row.product_sku || ""),
      order_kind: kind,
      status,
      provider: String(row.provider || ""),
      provider_checkout_id: String(row.provider_checkout_id || ""),
      provider_payment_id: String(row.provider_payment_id || ""),
      created_at: row.created_at,
      updated_at: row.updated_at,
      refunded_at: row.refunded_at,
      created_at_text: String(row.created_at_text || ""),
      updated_at_text: String(row.updated_at_text || ""),
      refunded_at_text: String(row.refunded_at_text || ""),
      /** @deprecated use refund_visible + refund_eligible */
      can_refund: refund_eligible,
      refund_visible: refundVisible,
      refund_eligible,
      refund_block_key,
      can_cancel_subscription: canCancelSubscription
    };
  });
  return Response.json({ status: 1, orders });
}

