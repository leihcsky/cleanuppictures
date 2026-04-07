import {getDb} from "~/libs/db";
import { getBusinessDateString } from "~/libs/date";

const db = getDb();
function getTodayDate() {
  return getBusinessDateString();
}

export const checkUserTimes = async (user_id) => {
  const freeTimes = Number(process.env.FREE_TIMES || 3);
  const today = getTodayDate();
  const results = await db.query(`select * from daily_usage where user_id=$1 and date=$2 limit 1;`, [Number(user_id), today]);
  const result = results.rows;
  if (result.length <= 0) {
    return true;
  }
  const usage = result[0];
  return Number(usage.used_count || 0) < freeTimes;
}

export const countDownUserTimes = async (user_id) => {
  const today = getTodayDate();
  const results = await db.query(`select * from daily_usage where user_id=$1 and date=$2 limit 1;`, [Number(user_id), today]);
  const result = results.rows;
  if (result.length > 0) {
    const usage = result[0];
    const nextCount = Number(usage.used_count || 0) + 1;
    await db.query('update daily_usage set used_count=$1 where id=$2', [nextCount, usage.id]);
  } else {
    await db.query('insert into daily_usage(user_id,date,used_count) values($1,$2,$3)', [Number(user_id), today, 1]);
  }
}
