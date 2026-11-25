import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware, getAuthoritativeSessionFromCtx } from "better-auth/api";
import { prisma } from "./db";
import { GATE_COOKIE, gateEnabled, isValidGateToken } from "./site-gate";
import { deleteNeedsPassword, unlinkRemovesPassword } from "./delete-guard";

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
  user: {
    // Settings > Delete account. Accounts with a password must send it (the
    // before-hook below enforces that, since Better Auth alone only checks a
    // password it is given). Accounts without one need a fresh session,
    // signed in within session.freshAge (a day by default). Deleting the user
    // row cascades to sessions, linked accounts, attempts and progress.
    deleteUser: { enabled: true },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/delete-user" && ctx.path !== "/unlink-account") return;
      // The same authoritative read the endpoints do, so the two can't
      // disagree. No session: the endpoint itself answers 401.
      const session = await getAuthoritativeSessionFromCtx(ctx);
      if (!session) return;
      if (ctx.path === "/unlink-account") {
        const accounts = await ctx.context.internalAdapter.findAccounts(session.user.id);
        if (unlinkRemovesPassword(ctx.body, accounts)) {
          throw new APIError("BAD_REQUEST", {
            message: "Your password sign-in can't be removed.",
            code: "CANNOT_UNLINK_PASSWORD",
          });
        }
        return;
      }
      const credential = await ctx.context.internalAdapter.findCredentialAccount(session.user.id);
      if (deleteNeedsPassword(ctx.body, Boolean(credential?.password))) {
        throw new APIError("BAD_REQUEST", {
          message: "Enter your password to delete your account.",
          code: "PASSWORD_REQUIRED",
        });
      }
    }),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: extensionOrigins,
  // Keep counters in Postgres (the rate_limit table) so limits hold across
  // instances and restarts, and stay on outside production too. Better
  // Auth's stricter built-in rules for sign-in, sign-up and password reset
  // still apply on top of this default.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
  },
  advanced: {
    ipAddress: {
      // The header your host sets to the real client IP. Without it, a
      // multi-hop x-forwarded-for makes every client share one bucket.
      ...(process.env.RATE_LIMIT_IP_HEADER && {
        ipAddressHeaders: [process.env.RATE_LIMIT_IP_HEADER],
      }),
    },
  },
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
