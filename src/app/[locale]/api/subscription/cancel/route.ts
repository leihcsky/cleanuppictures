import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getDb } from "~/libs/db";
import { getCreemClient } from "~/libs/creem";

/** @see https://docs.creem.io/api-reference/endpoint/cancel-subscription */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = Number((token as any)?.user_id || 0);
  if (!userId) {
    return Response.json({ status: 0, msg: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const subRes = await db.query(
    "select id,provider,provider_subscription_id,status from subscriptions where user_id=$1 order by id desc limit 1",
    [userId]
  );
  const sub = subRes.rows?.[0];
  if (!sub) {
    return Response.json({ status: 0, msg: "Subscription not found" }, { status: 404 });
  }
  if (String(sub.provider || "") !== "creem") {
    return Response.json({ status: 0, msg: "Only Creem subscription cancel is supported here" }, { status: 400 });
  }
  const subStatus = String(sub.status || "").toLowerCase();
  if (subStatus !== "active") {
    return Response.json(
      { status: 0, msg: `Subscription is ${subStatus || "unknown"}, only active subscription can be canceled` },
      { status: 400 }
    );
  }
  const providerSubId = String(sub.provider_subscription_id || "");
  if (!providerSubId) {
    return Response.json({ status: 0, msg: "Missing provider subscription id, please contact support" }, { status: 400 });
  }

  try {
    const creem = getCreemClient();
    const result = await creem.subscriptions.cancel({
      subscriptionId: providerSubId,
      mode: "immediate"
    });
    const remoteStatus = String(result?.status || "canceled").toLowerCase();
    await db.query("update subscriptions set status=$1 where id=$2", [remoteStatus || "canceled", Number(sub.id || 0)]);
    const lastSubOrderRes = await db.query(
      "select id from orders where user_id=$1 and provider=$2 and order_kind=$3 and status=$4 order by id desc limit 1",
      [userId, "creem", "subscription", "paid"]
    );
    const lastSubOrderId = Number(lastSubOrderRes.rows?.[0]?.id || 0);
    if (lastSubOrderId > 0) {
      await db.query("update orders set status=$1,updated_at=now() where id=$2", ["canceled", lastSubOrderId]);
    }
    return Response.json({ status: 1, msg: "Subscription canceled", result });
  } catch (e: any) {
    return Response.json({ status: 0, msg: e?.message || "Cancel subscription failed" }, { status: 500 });
  }
}
