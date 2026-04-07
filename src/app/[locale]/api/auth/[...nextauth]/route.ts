import NextAuth, {NextAuthOptions} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from 'next-auth/providers/credentials';
import { OAuth2Client } from 'google-auth-library';
import {checkAndSaveUser, getUserByEmail} from "~/servers/user";
import {headers} from "next/headers";

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_SECRET_ID || process.env.GOOGLE_CLIENT_SECRET;
const googleAuthClient = new OAuth2Client(googleClientId)
const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId || '',
      clientSecret: googleSecret || ''
    }),
    CredentialsProvider({
      id: "googleonetap",
      name: "google-one-tap",
      credentials: {
        credential: { type: "text" },
      },
      authorize: async (credentials) => {
        const token = credentials?.credential;
        if (!token) {
          throw new Error("Google credential is required");
        }
        const ticket = await googleAuthClient.verifyIdToken({
          idToken: token,
          audience: googleClientId,
        });

        const payload = ticket.getPayload();
        if (!payload) {
          throw new Error("Cannot extract payload from signin token");
        }
        const { email, name, picture: image } = payload;
        if (!email) {
          throw new Error("Email not available");
        }
        const user = {email, name, image}
        const headerAll = headers();
        const userIp = headerAll.get("x-forwarded-for");
        const savedUser = await checkAndSaveUser(user.name || '', user.email, user.image || '', userIp || '');
        return {
          id: savedUser?.user_id || user.email,
          ...user,
          user_id: savedUser?.user_id || ''
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
  callbacks: {
    async signIn({user, account, profile, email, credentials}) {
      const headerAll = headers();
      const userIp = headerAll.get("x-forwarded-for");
      await checkAndSaveUser(user.name || '', user.email || '', user.image || '', userIp || '');
      return true
    },
    async redirect({url, baseUrl}) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await getUserByEmail(user.email);
        token.user_id = dbUser?.user_id || '';
      }
      return token;
    },
    async session({session, token}) {
      if (session) {
        // @ts-ignore
        session.user.user_id = token?.user_id || '';
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions);

export {handler as GET, handler as POST};
