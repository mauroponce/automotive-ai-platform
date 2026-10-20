import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { cookies } from "next/headers";
import GoogleProvider from "next-auth/providers/google";
import type { Provider } from "next-auth/providers/index";
import { db } from "@/lib/db";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const providers: Provider[] = [];

if (googleConfigured) {
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // Google-verified email ownership is the explicit account-linking policy.
    allowDangerousEmailAccountLinking: true,
  }));
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !user.email) return false;
      if ((profile as { email_verified?: boolean } | undefined)?.email_verified !== true) return false;

      const intent = (await cookies()).get("autoframe-auth-intent")?.value;
      if (intent === "registration") return true;

      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { email: user.email },
            { accounts: { some: { provider: "google", providerAccountId: account.providerAccountId } } },
          ],
        },
        select: { id: true },
      });
      return Boolean(existingUser);
    },
  },
};
