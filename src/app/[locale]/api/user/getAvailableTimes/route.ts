import {getDb} from "~/libs/db";
import { getBusinessDateString } from "~/libs/date";

export const revalidate = 0;
export const GET = async (req: Request) => {
  const query = new URL(req.url).searchParams;
  const userId = query.get("userId");
  const freeTimes = Number(process.env.FREE_TIMES || 3);
  const today = getBusinessDateString();

  const db = getDb();

  const result = {
    userId: userId,
    available_times: freeTimes,
    subscribeStatus: ''
  };

  if (userId) {

    const resultsSubscribe = await db.query('SELECT * FROM subscriptions where user_id=$1 order by id desc limit 1', [Number(userId)]);
    const originSubscribe = resultsSubscribe.rows;
    if (originSubscribe.length > 0) {
      if (originSubscribe[0].status == 'active') {
        result.subscribeStatus = originSubscribe[0].status
      }
    }

    const results = await db.query('SELECT * FROM daily_usage where user_id=$1 and date=$2 limit 1', [Number(userId), today]);
    const origin = results.rows;

    if (origin.length !== 0) {
      result.available_times = Math.max(0, freeTimes - Number(origin[0].used_count || 0));
    }
  }
  return Response.json(result);
}
