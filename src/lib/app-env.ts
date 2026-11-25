// Which deployment this is, from ENV (the same variable the dev pill and the
// extension build read). Dev-only features check isDevEnv(), which is strict:
// only ENV=dev (any case) counts. Unset, empty or any other value is treated
// as production, so a deploy that forgets ENV never exposes dev features.

export function isDevEnv(env: string | undefined = process.env.ENV): boolean {
  return (env ?? "").trim().toLowerCase() === "dev";
}

/** The environment pill in the nav: none in production (ENV unset). */
export type EnvPill = "dev" | "test";

/** ENV=dev or ENV=test (any case) get a pill; unset or anything else, none. */
export function envPill(env: string | undefined = process.env.ENV): EnvPill | null {
  const value = (env ?? "").trim().toLowerCase();
  return value === "dev" || value === "test" ? value : null;
}

/**
 * The extension's Chrome Web Store listing, from CHROME_WEB_STORE_URL. Only
 * an https URL on chromewebstore.google.com is accepted; anything else is
 * ignored so a typo can't send people somewhere unexpected.
 */
export function chromeWebStoreUrl(raw: string | undefined = process.env.CHROME_WEB_STORE_URL): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" && url.hostname === "chromewebstore.google.com" ? url.toString() : null;
  } catch {
    return null;
  }
}
