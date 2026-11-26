import { describe, expect, it } from "vitest";
import { strToU8, unzipSync, strFromU8 } from "fflate";
import { buildExtensionZip, DEV_EXTENSION_ID } from "./extension-package";
import {
  DEV_EXTENSION_KEY,
  extensionIdFromKey,
  isPackagedFile,
  packagedManifest,
} from "../../scripts/extension-manifest.mjs";

const manifest = {
  manifest_version: 3,
  name: "LeetPro (Dev)",
  version: "1.0.0",
  host_permissions: ["https://leetcode.com/*", "https://neetcode.io/*", "http://localhost:3000/*"],
};

function files() {
  return {
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "config.js": strToU8('self.LEETPRO_CONFIG = { apiBase: "http://localhost:3000", env: "dev" };'),
    "popup/popup.js": strToU8("console.log('popup');"),
    ".DS_Store": strToU8("junk"),
    "old.zip": strToU8("junk"),
    "key.pem": strToU8("secret"),
    ".env": strToU8("secret"),
    ".git/config": strToU8("secret"),
    "popup/popup.js~": strToU8("backup"),
    "icons/icon16.png": strToU8("png"),
  };
}

describe("packagedManifest", () => {
  it("swaps the localhost host permission for the target origin", () => {
    const out = packagedManifest(manifest, { apiBase: "https://dev.leetpro.app", env: "dev" });
    expect(out.host_permissions).toEqual([
      "https://leetcode.com/*",
      "https://neetcode.io/*",
      "https://dev.leetpro.app/*",
    ]);
  });

  it("pins the dev key for dev builds and drops it for prod", () => {
    expect(packagedManifest(manifest, { apiBase: "https://x.test", env: "dev" }).key).toBe(DEV_EXTENSION_KEY);
    const prod = packagedManifest({ ...manifest, key: "abc" }, { apiBase: "https://x.test", env: "PROD" });
    expect(prod.key).toBeUndefined();
    expect(prod.name).toBe("LeetPro");
  });

  it("does not change the manifest it was given", () => {
    packagedManifest(manifest, { apiBase: "https://x.test", env: "dev" });
    expect(manifest.host_permissions).toContain("http://localhost:3000/*");
  });
});

describe("isPackagedFile", () => {
  it("keeps the extension's own file types", () => {
    for (const p of ["manifest.json", "config.js", "popup/popup.html", "popup/popup.css", "icons/icon16.png"]) {
      expect(isPackagedFile(p)).toBe(true);
    }
  });

  it("never ships keys, env files, dotfiles or backups", () => {
    for (const p of ["key.pem", "dev.key", ".env", ".env.local", ".DS_Store", ".git/config", "content/.hidden.js", "a.js~", "old.zip"]) {
      expect(isPackagedFile(p)).toBe(false);
    }
  });
});

describe("extensionIdFromKey", () => {
  it("is 32 letters from a to p", () => {
    expect(extensionIdFromKey(DEV_EXTENSION_KEY)).toMatch(/^[a-p]{32}$/);
    expect(DEV_EXTENSION_ID).toBe(extensionIdFromKey(DEV_EXTENSION_KEY));
  });
});

describe("buildExtensionZip", () => {
  const zip = unzipSync(buildExtensionZip(files(), { apiBase: "https://dev.leetpro.app", env: "dev" }));

  it("nests everything in a leetpro-extension folder and ships only allowlisted files", () => {
    expect(Object.keys(zip).sort()).toEqual([
      "leetpro-extension/config.js",
      "leetpro-extension/icons/icon16.png",
      "leetpro-extension/manifest.json",
      "leetpro-extension/popup/popup.js",
    ]);
  });

  it("points config.js and the manifest at the target origin", () => {
    expect(strFromU8(zip["leetpro-extension/config.js"])).toContain('apiBase: "https://dev.leetpro.app"');
    const out = JSON.parse(strFromU8(zip["leetpro-extension/manifest.json"]));
    expect(out.host_permissions).toContain("https://dev.leetpro.app/*");
    expect(out.host_permissions).not.toContain("http://localhost:3000/*");
    expect(out.key).toBe(DEV_EXTENSION_KEY);
  });

  it("keeps other files byte for byte", () => {
    expect(strFromU8(zip["leetpro-extension/popup/popup.js"])).toBe("console.log('popup');");
  });
});
