// Better Auth's delete-user endpoint only verifies a password when the client
// sends one; without it, any session signed in within freshAge (a day) can
// delete the account. LeetPro requires the password for every account that
// has one, so a stolen or shared session can't wipe it. auth.ts runs this in
// a before-hook; Better Auth then verifies the password that was sent.

/** True when this delete request must be refused for lacking a password. */
export function deleteNeedsPassword(body: unknown, accountHasPassword: boolean): boolean {
  if (!accountHasPassword) return false;
  const password = body && typeof body === "object" ? (body as { password?: unknown }).password : undefined;
  return !(typeof password === "string" && password.length > 0);
}

/**
 * True when an unlink-account request would remove the password login.
 * Better Auth's endpoint takes the account row's `accountId` (not a provider
 * name), so this looks that id up in the user's own accounts. Settings has no
 * way to unlink the password, and allowing it would let a stolen session
 * unlink it and then delete the account as if it never had one.
 */
export function unlinkRemovesPassword(
  body: unknown,
  accounts: { id: string; providerId: string }[],
): boolean {
  const accountId = body && typeof body === "object" ? (body as { accountId?: unknown }).accountId : undefined;
  if (typeof accountId !== "string") return false;
  return accounts.some((a) => a.id === accountId && a.providerId === "credential");
}
