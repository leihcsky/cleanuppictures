import {getWorkListByUserId} from "~/servers/works";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const revalidate = 0;

export async function POST(req: NextRequest, res: Response) {

  const json = await req.json();
  const user_id = Number(json.user_id || 0);
  const current_page = json.current_page;
  const loginEnabled = process.env.NEXT_PUBLIC_CHECK_GOOGLE_LOGIN != '0';
  if (loginEnabled) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const tokenUserId = Number(token?.user_id || 0);
    if (!tokenUserId || tokenUserId !== user_id) {
      return new Response(JSON.stringify({ message: 'Unauthorized', status: 401 }), {
        headers: {"Content-Type": "application/json"},
        status: 401
      });
    }
  }

  const works = await getWorkListByUserId(String(user_id), current_page);

  return new Response(JSON.stringify(works), {
    headers: {"Content-Type": "application/json"},
    status: 200
  });
}
