// Fixed-window rate limiting backed by Postgres (the app_rate_limit table), so
// limits hold across serverless instances and restarts. Better Auth limits
// /api/auth/* itself (see auth.ts); this covers the gate and the app API.

import { NextResponse } from "next/server";
import { prisma } from "./db";

export type RateRule = { limit: number; windowSeconds: number };

export const RATE_RULES = {
  // Per signed-in user, across all read endpoints. The extension fetches
  // problem stats on every problem page, so this is generous.
  apiRead: { limit: 120, windowSeconds: 60 },
  // Per signed-in user, across endpoints that write (log/edit attempts,
  // create problems).
  apiWrite: { limit: 30, windowSeconds: 60 },
  // Per IP, every gate password attempt.
  gateIp: { limit: 10, windowSeconds: 15 * 60 },
  // All gate attempts from everywhere, so spreading guesses over many IPs
  // doesn't help. Under attack this also locks out real visitors for up to
  // an hour, which is the right trade for a private dev instance.
  gateGlobal: { limit: 300, windowSeconds: 60 * 60 },
} satisfies Record<string, RateRule>;

export type RateResult = { allowed: boolean; retryAfter: number };

/** Counts one hit against `key` and says whether it is within the rule. */
export async function consumeRateLimit(key: string, rule: RateRule): Promise<RateResult> {
  const window = rule.windowSeconds;
  const rows = await prisma.$queryRaw<{ count: number; retry_after: number }[]>`
    INSERT INTO "app_rate_limit" ("key", "count", "window_start")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "app_rate_limit"."window_start" <= now() - make_interval(secs => ${window}::double precision)
        THEN 1 ELSE "app_rate_limit"."count" + 1 END,
      "window_start" = CASE
        WHEN "app_rate_limit"."window_start" <= now() - make_interval(secs => ${window}::double precision)
        THEN now() ELSE "app_rate_limit"."window_start" END
    RETURNING
      "count",
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM
        ("window_start" + make_interval(secs => ${window}::double precision) - now())
      )))::int AS "retry_after"`;

  // Drop long-expired windows now and then so the table stays small.
  if (Math.random() < 0.01) {
    prisma.$executeRaw`
      DELETE FROM "app_rate_limit" WHERE "window_start" < now() - interval '1 day'`.catch(() => {});
  }

  const row = rows[0];
  return { allowed: row.count <= rule.limit, retryAfter: row.retry_after };
}

/**
 * For route handlers: returns a 429 response when the user is over the limit,
 * or null to carry on.
 */
export async function limitUser(
  userId: string,
  kind: "apiRead" | "apiWrite",
): Promise<NextResponse | null> {
  const { allowed, retryAfter } = await consumeRateLimit(`${kind}:${userId}`, RATE_RULES[kind]);
  if (allowed) return null;
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/**
 * Best-effort client IP for unauthenticated limits. Set RATE_LIMIT_IP_HEADER
 * to the header your host sets to the real client IP (for example x-real-ip
 * or x-vercel-forwarded-for). Otherwise this uses the last x-forwarded-for
 * hop, which the nearest proxy appended and the client can't choose.
 */
export function clientIp(headers: Headers): string {
  const configured = process.env.RATE_LIMIT_IP_HEADER;
  if (configured) {
    const value = headers.get(configured)?.split(",")[0]?.trim();
    if (value) return value;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  if (forwarded?.length) return forwarded[forwarded.length - 1];
  return "unknown";
}
