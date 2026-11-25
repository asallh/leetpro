import { join } from "node:path";
import { auth } from "@/lib/auth";
import { envPill } from "@/lib/app-env";
import { buildExtensionZip, readExtensionFiles } from "@/lib/extension-package";
import { limitUser } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// A ready-to-load pre-release build of the Chrome extension, pointed at
// whichever origin serves this request. Only exists when ENV=dev or
// ENV=test; production users get the extension from the Chrome Web Store.
export async function GET(request: Request) {
  const env = envPill();
  if (!env) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await limitUser(session.user.id, "apiRead");
  if (limited) return limited;

  const apiBase = new URL(request.url).origin;
  // The folder is bundled into this function by outputFileTracingIncludes in
  // next.config.ts.
  const files = await readExtensionFiles(join(process.cwd(), "extension"));
  const zip = buildExtensionZip(files, { apiBase, env });

  return new Response(new Blob([zip as BlobPart], { type: "application/zip" }), {
    headers: {
      "Content-Disposition": `attachment; filename="leetpro-extension-${env}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
