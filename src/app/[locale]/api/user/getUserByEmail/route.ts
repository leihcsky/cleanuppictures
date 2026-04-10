import {getUserByEmail} from "~/servers/user";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest, res: Response) {
  let json = await req.json();
  let email = String(json.email || '').trim();
  const loginEnabled = process.env.NEXT_PUBLIC_CHECK_GOOGLE_LOGIN != '0';
  if (loginEnabled) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const tokenEmail = String(token?.email || '').trim().toLowerCase();
    if (!tokenEmail || tokenEmail !== email.toLowerCase()) {
      return Response.json({ user_id: '', name: '', email: '', image: '', status: 0 }, { status: 401 });
    }
  }

  const result = await getUserByEmail(email);
  return Response.json(result);

}
