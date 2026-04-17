import { getDb } from "~/libs/db";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const orderId = Number(body?.orderId || 0);
  if (!orderId) {
    return Response.json({ status: 0, msg: "Invalid order id" }, { status: 400 });
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = Number((token as any)?.user_id || 0);
  if (!userId) {
    return Response.json({ status: 0, msg: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const orderRes = await db.query("select * from orders where id=$1 and user_id=$2 limit 1", [orderId, userId]);
  const order = orderRes.rows?.[0];
  if (!order) {
    return Response.json({ status: 0, msg: "Order not found" }, { status: 404 });
  }
  const status = String(order.status || "").toLowerCase();
  if (status === "refund_requested") {
    return Response.json({ status: 0, msg: "Refund has already been requested" }, { status: 400 });
  }
  if (status === "refunded") {
    return Response.json({ status: 0, msg: "Order has already been refunded" }, { status: 400 });
  }
  if (status !== "paid") {
    return Response.json({ status: 0, msg: "Order is not refundable in current status" }, { status: 400 });
  }
  if (String(order.order_kind || "") !== "credit_pack") {
    return Response.json({ status: 0, msg: "Only credit pack orders can be refunded from this page" }, { status: 400 });
  }

  try {
    const createdAtTs = new Date(order.created_at || "").getTime();
    const nowTs = Date.now();
    const ageDays = Number.isFinite(createdAtTs) ? Math.floor((nowTs - createdAtTs) / (24 * 60 * 60 * 1000)) : 9999;
    if (ageDays > 7) {
      return Response.json({ status: 0, msg: "Refund window expired (more than 7 days)" }, { status: 400 });
    }

    const bucketRes = await db.query(
      "select coalesce(sum(granted_credits),0) as granted_total, coalesce(sum(remaining_credits),0) as remaining_total from credit_buckets where order_id=$1",
      [orderId]
    );
    const grantedTotal = Number(bucketRes.rows?.[0]?.granted_total || 0);
    const remainingTotal = Number(bucketRes.rows?.[0]?.remaining_total || 0);
    if (grantedTotal <= 0) {
      return Response.json({ status: 0, msg: "No credit bucket found for this order" }, { status: 400 });
    }
    if (remainingTotal < grantedTotal) {
      return Response.json({ status: 0, msg: "Used credits are not refundable" }, { status: 400 });
    }

    await db.query("update orders set status=$1,updated_at=now() where id=$2", ["refund_requested", orderId]);
    await db.query(
      "update credit_buckets set refund_requested_at=coalesce(refund_requested_at,now()),updated_at=now() where order_id=$1 and status in ($2,$3,$4)",
      [orderId, "active", "depleted", "void"]
    );
    return Response.json({ status: 1, msg: "Refund request submitted for manual review" });
  } catch (e: any) {
    return Response.json({ status: 0, msg: e?.message || "Refund request failed" }, { status: 500 });
  }
}

