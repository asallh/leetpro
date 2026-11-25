// Which deployment this is, from ENV. Only ENV=dev and ENV=test (any case)
// are pre-release environments; unset, empty or any other value is treated
// as production, so a deploy that forgets ENV never exposes their features.

/** A pre-release environment: gets the nav pill and the extension download. */
export type EnvPill = "dev" | "test";

/** ENV=dev or ENV=test (any case); null in production (ENV unset). */
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
