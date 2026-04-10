import {getUserById} from "~/servers/user";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest, res: Response) {
  let json = await req.json();
  let user_id = Number(json.user_id || 0);
  const loginEnabled = process.env.NEXT_PUBLIC_CHECK_GOOGLE_LOGIN != '0';
  if (loginEnabled) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const tokenUserId = Number(token?.user_id || 0);
    if (!tokenUserId || tokenUserId !== user_id) {
      return Response.json({ user_id: String(user_id || ''), name: '', email: '', image: '', status: 0 }, { status: 401 });
    }
  }

  const result = await getUserById(user_id);
  return Response.json(result);

}
