import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import {
  GATE_COOKIE,
  GATE_MAX_AGE,
  checkGatePassword,
  expectedGateToken,
  gateEnabled,
  safeNextPath,
} from "@/lib/site-gate";
import { RATE_RULES, clientIp, consumeRateLimit } from "@/lib/rate-limit";

export const metadata: Metadata = {
  title: "Private preview · LeetPro",
  robots: { index: false, follow: false },
};

async function unlock(formData: FormData) {
  "use server";
  const next = safeNextPath(formData.get("next"));
  const password = formData.get("password");

  const h = await headers();
  const [perIp, global] = await Promise.all([
    consumeRateLimit(`gate:ip:${clientIp(h)}`, RATE_RULES.gateIp),
    consumeRateLimit("gate:global", RATE_RULES.gateGlobal),
  ]);
  if (!perIp.allowed || !global.allowed) {
    redirect(`/gate?error=rate&next=${encodeURIComponent(next)}`);
  }

  if (typeof password !== "string" || !(await checkGatePassword(password))) {
    // Small fixed delay to make online guessing slower.
    await new Promise((r) => setTimeout(r, 750));
    redirect(`/gate?error=1&next=${encodeURIComponent(next)}`);
  }

  (await cookies()).set(GATE_COOKIE, await expectedGateToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_MAX_AGE,
  });
  redirect(next);
}

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  if (!gateEnabled()) redirect("/");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 text-lg">
        <Logo />
      </div>
      <Card className="w-full max-w-sm rounded-2xl py-2 shadow-[0_16px_36px_-16px_rgba(0,0,0,0.55)]">
        <CardHeader>
          <CardTitle className="marker text-[1.75rem] leading-tight font-bold">
            Private preview
          </CardTitle>
          <CardDescription>
            This LeetPro instance is invite-only. Enter the access password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={unlock} className="space-y-4">
            <input type="hidden" name="next" value={safeNextPath(next)} />
            <div className="space-y-2">
              <Label htmlFor="password">Access password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "gate-error" : undefined}
              />
            </div>
            {error && (
              <p id="gate-error" role="alert" className="text-sm text-destructive">
                {error === "rate"
                  ? "Too many attempts. Try again in a few minutes."
                  : "That password isn't right."}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full rounded-lg">
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
