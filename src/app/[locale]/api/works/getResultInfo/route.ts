import {getDb} from "~/libs/db";
import {getArrayUrlResult} from "~/configs/buildLink";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const revalidate = 0;

export const GET = async (req: NextRequest) => {
  const query = new URL(req.url).searchParams;

  const userId = query.get("userId");
  const uid = query.get("uid");

  const result = {
    status: 404,
    uid: uid,
    input_text: '',
    output_url: [],
    is_public: false,
    message: 'error',
    user_id: userId,
    revised_text: ''
  }

  const loginEnabled = process.env.NEXT_PUBLIC_CHECK_GOOGLE_LOGIN != '0';
  if ((!userId || userId === 'undefined') && loginEnabled) {
    return Response.json(result);
  }
  if (loginEnabled) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const tokenUserId = Number(token?.user_id || 0);
    const targetUserId = Number(userId || 0);
    if (!tokenUserId || tokenUserId !== targetUserId) {
      return Response.json({ ...result, status: 401, message: "unauthorized" }, { status: 401 });
    }
  }

  const db = getDb();

  let results;
  if (loginEnabled) {
    results = await db.query('select * from works where uid=$1 and user_id=$2 and is_origin=$3 and is_delete=$4', [uid, userId, true, false]);
  } else {
    results = await db.query('select * from works where uid=$1 and is_origin=$2 and is_delete=$3', [uid, true, false]);
  }

  const resultData = results.rows;
  if (resultData.length <= 0) {
    return Response.json(result);
  }

  const data = resultData[0];
  result.status = data.status;
  result.input_text = data.input_text;
  result.output_url = getArrayUrlResult(data.output_url);
  result.is_public = data.is_public;
  result.user_id = data.user_id;
  result.uid = data.uid;
  result.revised_text = data.revised_text;

  return Response.json(result);
}
