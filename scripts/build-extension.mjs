#!/usr/bin/env node
// Builds a Chrome Web Store–ready copy of the extension that talks to one
// deployed LeetPro origin.
//
//   pnpm extension:build --api-base https://leetpro.example.com --env prod
//   LEETPRO_API_BASE=https://leetpro.example.com ENV=prod pnpm extension:build
//
// --env (or ENV) works like the web app's ENV: anything but "prod" builds a
// dev extension, named "LeetPro (Dev)" with a DEV pill and a stamped icon.
//
// Output: dist/extension/ (load unpacked to test) and
//         dist/leetpro-extension-<version>.zip (upload to the Web Store).
//
// The checked-in extension/ folder stays pointed at http://localhost:3000.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_EXTENSION_ID, isProdEnv, packagedConfig, packagedManifest } from "./extension-manifest.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "extension");
const outDir = join(root, "dist");
const out = join(outDir, "extension");

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = process.argv[i + 1];
  if (!value || value.startsWith("--")) fail(`--${name} needs a value`);
  return value;
}

// --- resolve and validate the API origin ------------------------------------
const raw = arg("api-base") ?? process.env.LEETPRO_API_BASE;
if (!raw) {
  fail(
    "Missing the deployed app URL.\n" +
      "  pnpm extension:build --api-base https://your-domain.com"
  );
}

let url;
try {
  url = new URL(raw);
} catch {
  fail(`Not a valid URL: ${raw}`);
}

const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
if (url.protocol !== "https:" && !isLocal) {
  fail(`The API base must use https:// (got ${url.protocol}//). Session cookies are Secure in production.`);
}
if ((url.pathname !== "/" && url.pathname !== "") || url.search || url.hash) {
  fail(`Use the bare origin, without a path: ${url.origin}`);
}
const apiBase = url.origin;

const env = (arg("env") ?? process.env.ENV ?? "dev").toLowerCase();
const isProd = isProdEnv(env);

// --- copy ---------------------------------------------------------------------
rmSync(out, { recursive: true, force: true });
cpSync(src, out, {
  recursive: true,
  filter: (path) => !/(^|\/)(\.DS_Store|.*\.zip)$/.test(path),
});

// --- config.js and manifest ---------------------------------------------------
// The rules live in extension-manifest.mjs, shared with the app's dev download.
writeFileSync(join(out, "config.js"), packagedConfig({ apiBase, env }));

const manifestPath = join(out, "manifest.json");
const version = arg("version");
if (version) {
  if (!/^\d+(\.\d+){0,3}$/.test(version)) fail(`Chrome versions are 1–4 dot-separated integers: ${version}`);
}
const manifest = packagedManifest(JSON.parse(readFileSync(manifestPath, "utf8")), { apiBase, env, version });
const devExtensionId = isProd ? null : DEV_EXTENSION_ID;

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

// --- sanity checks ------------------------------------------------------------
// A production build must not reference a dev server anywhere.
if (!isLocal) {
  const leaks = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|json|html|css)$/.test(name) && /localhost|127\.0\.0\.1/.test(readFileSync(p, "utf8"))) {
        leaks.push(relative(out, p));
      }
    }
  };
  walk(out);
  if (leaks.length) fail(`These files still reference localhost:\n  ${leaks.join("\n  ")}`);
}

for (const file of [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...(manifest.content_scripts ?? []).flatMap((c) => c.js ?? []),
  ...Object.values(manifest.icons ?? {}),
]) {
  if (file && !existsSync(join(out, file))) fail(`manifest.json points at a missing file: ${file}`);
}

// --- zip ----------------------------------------------------------------------
const zipPath = join(outDir, `leetpro-extension-${manifest.version}.zip`);
rmSync(zipPath, { force: true });
try {
  execFileSync("zip", ["-r", "-X", "-q", zipPath, "."], { cwd: out, stdio: "inherit" });
} catch {
  fail("Couldn't create the zip. Is the `zip` command installed?");
}

console.log(`
✓ ${manifest.name} ${manifest.version} → ${apiBase}
  Unpacked: ${relative(root, out)}/
  Package:  ${relative(root, zipPath)}
`);

if (devExtensionId) {
  console.log(`  Extension ID (same on every install of this dev build): ${devExtensionId}
  On the deployed app, set LEETPRO_EXTENSION_IDS=${devExtensionId}
  so the popup can sign out.
`);
}
