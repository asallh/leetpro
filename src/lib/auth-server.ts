import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function getRequiredSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}

export async function getOptionalSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
