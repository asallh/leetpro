import { describe, expect, it } from "vitest";
import { isDevEnv } from "./app-env";

describe("isDevEnv", () => {
  it("is true for ENV=dev in any case", () => {
    expect(isDevEnv("dev", "production")).toBe(true);
    expect(isDevEnv("DEV", "production")).toBe(true);
    expect(isDevEnv(" Dev ", "production")).toBe(true);
  });

  it("is false for prod and anything else that is set", () => {
    expect(isDevEnv("prod", "development")).toBe(false);
    expect(isDevEnv("staging", "development")).toBe(false);
  });

  it("falls back to next dev when ENV is unset", () => {
    expect(isDevEnv(undefined, "development")).toBe(true);
    expect(isDevEnv("", "development")).toBe(true);
    expect(isDevEnv(undefined, "production")).toBe(false);
  });
});
