import { describe, expect, it } from "vitest";
import { chromeWebStoreUrl, envPill, isDevEnv } from "./app-env";

describe("isDevEnv", () => {
  it("is true for ENV=dev in any case", () => {
    expect(isDevEnv("dev")).toBe(true);
    expect(isDevEnv("DEV")).toBe(true);
    expect(isDevEnv(" Dev ")).toBe(true);
  });

  it("is false for prod and anything else that is set", () => {
    expect(isDevEnv("prod")).toBe(false);
    expect(isDevEnv("staging")).toBe(false);
    expect(isDevEnv("development")).toBe(false);
  });

  it("is false when ENV is unset or empty, even under next dev", () => {
    expect(isDevEnv(undefined)).toBe(false);
    expect(isDevEnv("")).toBe(false);
  });
});

describe("chromeWebStoreUrl", () => {
  it("accepts a Chrome Web Store listing", () => {
    expect(chromeWebStoreUrl("https://chromewebstore.google.com/detail/leetpro/abc")).toBe(
      "https://chromewebstore.google.com/detail/leetpro/abc",
    );
  });

  it("is null when unset or not a Web Store https URL", () => {
    expect(chromeWebStoreUrl(undefined)).toBeNull();
    expect(chromeWebStoreUrl("  ")).toBeNull();
    expect(chromeWebStoreUrl("not a url")).toBeNull();
    expect(chromeWebStoreUrl("http://chromewebstore.google.com/detail/x")).toBeNull();
    expect(chromeWebStoreUrl("https://evil.example/detail/x")).toBeNull();
  });
});

describe("envPill", () => {
  it("shows dev and test in any case", () => {
    expect(envPill("dev")).toBe("dev");
    expect(envPill("DEV")).toBe("dev");
    expect(envPill(" Test ")).toBe("test");
  });

  it("shows nothing in production, where ENV is unset", () => {
    expect(envPill(undefined)).toBeNull();
    expect(envPill("")).toBeNull();
    expect(envPill("prod")).toBeNull();
    expect(envPill("staging")).toBeNull();
  });
});
