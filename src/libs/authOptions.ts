import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { OAuth2Client } from "google-auth-library";
import { checkAndSaveUser, getUserByEmail } from "~/servers/user";
import { headers } from "next/headers";
import { mergeGuestIntoAccountIfNeeded } from "~/servers/guestMerge";
import { getDb } from "~/libs/db";

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_SECRET_ID || process.env.GOOGLE_CLIENT_SECRET;
const googleAuthClient = new OAuth2Client(googleClientId);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId || "",
      clientSecret: googleSecret || ""
    }),
    CredentialsProvider({
      id: "googleonetap",
      name: "google-one-tap",
      credentials: {
        credential: { type: "text" }
      },
      authorize: async (credentials) => {
        const token = credentials?.credential;
        if (!token) {
          throw new Error("Google credential is required");
        }
        const ticket = await googleAuthClient.verifyIdToken({
          idToken: token,
          audience: googleClientId
        });

        const payload = ticket.getPayload();
        if (!payload) {
          throw new Error("Cannot extract payload from signin token");
        }
        const { email, name, picture: image } = payload;
        if (!email) {
          throw new Error("Email not available");
        }
        const user = { email, name, image };
        const headerAll = headers();
        const userIp = headerAll.get("x-forwarded-for");
        const savedUser = await checkAndSaveUser(user.name || "", user.email, user.image || "", userIp || "");
        return {
          id: savedUser?.user_id || user.email,
          ...user,
          user_id: savedUser?.user_id || ""
        };
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
  callbacks: {
    async signIn({ user }) {
      const headerAll = headers();
      const userIp = headerAll.get("x-forwarded-for");
      const savedUser = await checkAndSaveUser(user.name || "", user.email || "", user.image || "", userIp || "");
      const accountUserId = Number(savedUser?.user_id || 0);

      // Merge guest data at login time (don't wait for next business API call).
      if (accountUserId > 0) {
        try {
          const cookieRaw = headerAll.get("cookie") || "";
          const guestMatch = cookieRaw.match(/(?:^|;\s*)cp_guest_user_id=([^;]+)/i);
          const visitorMatch = cookieRaw.match(/(?:^|;\s*)cp_visitor_id=([^;]+)/i);
          const cookieGuestId = Number((guestMatch?.[1] || "").trim());
          if (cookieGuestId > 0 && cookieGuestId !== accountUserId) {
            await mergeGuestIntoAccountIfNeeded(cookieGuestId, accountUserId);
          }

          const visitorId = decodeURIComponent((visitorMatch?.[1] || "").trim());
          if (visitorId) {
            const db = getDb();
            await db.query(
              "update visitors set linked_user_id=$1,primary_guest_user_id=null,updated_at=now(),last_seen_at=now() where id=$2",
              [accountUserId, visitorId]
            );
          }
        } catch (e) {
          console.error("signIn guest merge failed:", e);
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
        const dbUser = await getUserByEmail(user.email);
        token.user_id = dbUser?.user_id || "";
      } else if (token.email && !token.user_id) {
        const dbUser = await getUserByEmail(String(token.email));
        token.user_id = dbUser?.user_id || "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.user_id = token?.user_id || "";
      }
      return session;
    }
  }
};
