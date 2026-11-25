import { describe, expect, it } from "vitest";
import { chromeWebStoreUrl, envPill } from "./app-env";

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
    expect(envPill("TEST")).toBe("test");
  });

  it("shows nothing in production, where ENV is unset", () => {
    expect(envPill(undefined)).toBeNull();
    expect(envPill("")).toBeNull();
    expect(envPill("prod")).toBeNull();
    expect(envPill("staging")).toBeNull();
    expect(envPill("development")).toBeNull();
  });
});
