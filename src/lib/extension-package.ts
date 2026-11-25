// Packs the checked-in extension/ folder into a zip that talks to one origin,
// for the dev-only download on Settings. The manifest and config rules are
// shared with scripts/build-extension.mjs.

import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { strToU8, zipSync } from "fflate";
import {
  DEV_EXTENSION_ID,
  isPackagedFile,
  packagedConfig,
  packagedManifest,
} from "../../scripts/extension-manifest.mjs";

export { DEV_EXTENSION_ID };

export type ExtensionFiles = Record<string, Uint8Array>;

/**
 * Rewrites manifest.json and config.js for `apiBase` and `env`, and zips the
 * result. Paths are relative to the extension root, with forward slashes.
 */
export function buildExtensionZip(
  files: ExtensionFiles,
  { apiBase, env }: { apiBase: string; env: string },
): Uint8Array {
  const manifestBytes = files["manifest.json"];
  if (!manifestBytes) throw new Error("extension/manifest.json is missing");
  const manifest = packagedManifest(JSON.parse(new TextDecoder().decode(manifestBytes)), { apiBase, env });

  const out: ExtensionFiles = {};
  for (const [path, bytes] of Object.entries(files)) {
    if (isPackagedFile(path)) out[path] = bytes;
  }
  out["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2) + "\n");
  out["config.js"] = strToU8(packagedConfig({ apiBase, env }));

  // Unzipping gives a "leetpro-extension" folder to pick in Load unpacked.
  const nested: ExtensionFiles = {};
  for (const [path, bytes] of Object.entries(out)) nested[`leetpro-extension/${path}`] = bytes;
  return zipSync(nested, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") });
}

/** Reads every file under `dir` into memory, keyed by relative path. */
export async function readExtensionFiles(dir: string): Promise<ExtensionFiles> {
  const files: ExtensionFiles = {};
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = join(entry.parentPath, entry.name);
    files[relative(dir, full).split(sep).join("/")] = new Uint8Array(await readFile(full));
  }
  return files;
}
