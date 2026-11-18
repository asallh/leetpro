import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function getRequiredSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    // `expired` tells the proxy not to bounce this request back to the
    // dashboard: the browser still holds a session cookie, but the session
    // behind it is gone (expired, signed out elsewhere, or the database was
    // reset). Without it the two redirects loop forever.
    redirect("/sign-in?expired=1");
  }
  return session;
}

export async function getOptionalSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
