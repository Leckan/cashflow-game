import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "wealthquest-local-dev-secret-change-me",
  pages: { signIn: "/profile" },
  providers: [
    Credentials({
      name: "Local demo",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        displayName: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase() ?? "";
        const password = credentials?.password?.toString() ?? "";
        const displayName = credentials?.displayName?.toString().trim() || email.split("@")[0] || "Player";
        if (!email.includes("@") || password !== "playlocal") return null;
        return { id: email, email, name: displayName };
      },
    }),
  ],
};
