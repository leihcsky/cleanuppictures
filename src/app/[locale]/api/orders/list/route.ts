import { getDb } from "~/libs/db";
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
  const orders = (res.rows || []).map((row: any) => {
    const status = String(row.status || "");
    const kind = String(row.order_kind || "credit_pack");
    const canRefund = status === "paid" && kind === "credit_pack";
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
      can_refund: canRefund,
      can_cancel_subscription: canCancelSubscription
    };
  });
  return Response.json({ status: 1, orders });
}

