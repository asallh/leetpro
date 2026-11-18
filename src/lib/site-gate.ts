// Site-wide password gate for private (dev/preview) deployments.
//
// Set SITE_PASSWORD to turn it on. Visitors must enter it once at /gate; we
// then set an httpOnly cookie holding an HMAC of the password, keyed by
// BETTER_AUTH_SECRET. Changing SITE_PASSWORD (or the secret) logs everyone
// out of the gate. Uses Web Crypto so it runs in the proxy runtime too.

export const GATE_COOKIE = "leetpro_gate";
export const GATE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function gateEnabled(): boolean {
  return Boolean(process.env.SITE_PASSWORD);
}

async function hmac(message: string): Promise<string> {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.SITE_PASSWORD || "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The cookie value a visitor holds after entering the right password. */
export function expectedGateToken(): Promise<string> {
  return hmac(`site-gate:v1:${process.env.SITE_PASSWORD ?? ""}`);
}

export async function isValidGateToken(token: string | undefined): Promise<boolean> {
  if (!token || !gateEnabled()) return false;
  return safeEqual(token, await expectedGateToken());
}

/** Compares a submitted password without leaking its length or prefix via timing. */
export async function checkGatePassword(input: string): Promise<boolean> {
  if (!gateEnabled()) return false;
  const [a, b] = await Promise.all([
    hmac(`site-gate:v1:${input}`),
    expectedGateToken(),
  ]);
  return safeEqual(a, b);
}

/** Only allow same-site relative paths as the post-gate redirect target. */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next.startsWith("/gate")) return "/";
  return next;
}
