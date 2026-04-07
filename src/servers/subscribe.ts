import {getDb} from "~/libs/db";

export const checkSubscribe = async (user_id: string) => {
  const db = getDb();

  const results = await db.query('SELECT * FROM subscriptions where user_id=$1 order by id desc limit 1', [Number(user_id)]);
  const origin = results.rows;

  if (origin.length > 0) {
    const data = origin[0].status;
    if (data == 'active') {
      return true;
    }
  }
  return false;
}
