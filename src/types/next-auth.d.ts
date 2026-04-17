import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      user_id?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user_id?: string;
    email?: string | null;
  }
}
