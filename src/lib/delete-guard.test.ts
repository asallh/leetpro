import { describe, expect, it } from "vitest";
import { deleteNeedsPassword, unlinkRemovesPassword } from "./delete-guard";

describe("deleteNeedsPassword", () => {
  it("refuses a password account when no password is sent", () => {
    expect(deleteNeedsPassword({}, true)).toBe(true);
    expect(deleteNeedsPassword(undefined, true)).toBe(true);
    expect(deleteNeedsPassword(null, true)).toBe(true);
  });

  it("refuses an empty or non-string password", () => {
    expect(deleteNeedsPassword({ password: "" }, true)).toBe(true);
    expect(deleteNeedsPassword({ password: 12345678 }, true)).toBe(true);
    expect(deleteNeedsPassword({ password: null }, true)).toBe(true);
  });

  it("lets a sent password through for Better Auth to verify", () => {
    expect(deleteNeedsPassword({ password: "anything" }, true)).toBe(false);
  });

  it("leaves accounts without a password to the fresh-session rule", () => {
    expect(deleteNeedsPassword({}, false)).toBe(false);
  });
});

describe("unlinkRemovesPassword", () => {
  const accounts = [
    { id: "acc_pw", providerId: "credential" },
    { id: "acc_gh", providerId: "github" },
  ];

  it("catches unlinking the password login by its account id", () => {
    expect(unlinkRemovesPassword({ accountId: "acc_pw" }, accounts)).toBe(true);
  });

  it("allows unlinking a social account", () => {
    expect(unlinkRemovesPassword({ accountId: "acc_gh" }, accounts)).toBe(false);
  });

  it("leaves unknown or missing ids to Better Auth, which rejects them", () => {
    expect(unlinkRemovesPassword({ accountId: "someone-elses" }, accounts)).toBe(false);
    expect(unlinkRemovesPassword({}, accounts)).toBe(false);
    expect(unlinkRemovesPassword(undefined, accounts)).toBe(false);
  });

  it("ignores a providerId field, which the endpoint does not read", () => {
    expect(unlinkRemovesPassword({ providerId: "credential" }, accounts)).toBe(false);
  });
});
