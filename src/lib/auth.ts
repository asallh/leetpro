import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { prisma } from "./db";
import { GATE_COOKIE, gateEnabled, isValidGateToken } from "./site-gate";

function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

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
  databaseHooks: {
    user: {
      create: {
        // Second line of defense behind the proxy: while the site gate is on,
        // only a visitor holding the gate cookie can create an account
        // (email sign-up or first social sign-in).
        before: async (_user, ctx) => {
          if (!gateEnabled() || !ctx) return;
          const cookieHeader = ctx.headers?.get("cookie") ?? ctx.request?.headers.get("cookie");
          if (!(await isValidGateToken(readCookie(cookieHeader, GATE_COOKIE)))) {
            throw new APIError("FORBIDDEN", { message: "Sign-up requires the site password." });
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});
