import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";

// Only our own extension may call the auth API from a chrome-extension://
// origin. Set LEETPRO_EXTENSION_IDS to a comma-separated list of extension IDs
// (chrome://extensions shows them). Without it, development accepts any
// extension so an unpacked build works, and production accepts none.
const extensionIds = (process.env.LEETPRO_EXTENSION_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const extensionOrigins =
  extensionIds.length > 0
    ? extensionIds.map((id) => `chrome-extension://${id}`)
    : process.env.NODE_ENV === "production"
      ? []
      : ["chrome-extension://*"];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: extensionOrigins,
  plugins: [nextCookies()],
});
