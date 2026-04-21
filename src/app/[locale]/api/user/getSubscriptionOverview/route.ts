import { getDb } from "~/libs/db";
import { getBusinessDateString } from "~/libs/date";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { getUserByEmail } from "~/servers/user";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  let userId = Number((token as any)?.user_id || 0);
  if (!userId && (token as any)?.email) {
    const row = await getUserByEmail(String((token as any).email));
    userId = Number(row?.user_id || 0);
  }
  const freeTimes = Number(process.env.FREE_TIMES || 3);
  const today = getBusinessDateString();

  if (!userId) {
    return Response.json({
      status: 0,
      subscribed: false,
      subscription_status: "",
      plan: "",
      credits_balance: 0,
      free_remaining: freeTimes
    });
  }

  const db = getDb();
  const userRes = await db.query("select id,email,user_name,is_guest from users where id=$1 limit 1", [userId]);
  if (userRes.rows.length <= 0) {
    return Response.json({
      status: 0,
      subscribed: false,
      subscription_status: "",
      plan: "",
      credits_balance: 0,
      free_remaining: freeTimes
    });
  }

  const subRes = await db.query("select * from subscriptions where user_id=$1 order by id desc limit 1", [userId]);
  const subRow = subRes.rows?.[0];
  const subStatus = String(subRow?.status || "");
  const subscribed =
    subStatus === "active" || subStatus === "trialing" || subStatus === "scheduled_cancel";

  const creditRes = await db.query("select * from credits where user_id=$1 limit 1", [userId]);
  const creditsBalance = Number(creditRes.rows?.[0]?.balance || 0);

  const usageRes = await db.query("select * from daily_usage where user_id=$1 and date=$2 limit 1", [userId, today]);
  const usedCount = Number(usageRes.rows?.[0]?.used_count || 0);
  const freeRemaining = Math.max(0, freeTimes - usedCount);

  return Response.json({
    status: 1,
    subscribed,
    subscription_status: subStatus,
    plan: String(subRow?.plan || ""),
    credits_balance: creditsBalance,
    free_remaining: freeRemaining,
    user: {
      id: Number(userRes.rows[0].id),
      email: String(userRes.rows[0].email || ""),
      user_name: String(userRes.rows[0].user_name || ""),
      is_guest: Boolean(userRes.rows[0].is_guest)
    }
  });
}
