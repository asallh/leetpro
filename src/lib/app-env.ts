// Which deployment this is, from ENV (the same variable the dev pill and the
// extension build read). Dev-only features check isDevEnv(), which is strict:
// only ENV=dev (any case) counts, so a production deploy that forgot to set
// ENV never exposes them. With ENV unset, local `next dev` still counts.

export function isDevEnv(
  env: string | undefined = process.env.ENV,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  const value = (env ?? "").trim().toLowerCase();
  if (value) return value === "dev";
  return nodeEnv === "development";
}
