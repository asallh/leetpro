import { getOptionalSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export default async function Home() {
  const session = await getOptionalSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-lg">
        <h1 className="text-5xl font-bold tracking-tight">LeetPro</h1>
        <p className="text-xl text-muted-foreground">
          Track your LeetCode and NeetCode practice with spaced repetition.
          Never forget a pattern again.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }))}>
            Get started
          </Link>
          <Link href="/sign-in" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            Sign in
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-8 text-sm text-muted-foreground">
          <div>
            <p className="text-2xl font-bold text-foreground">Auto-detect</p>
            <p>Chrome extension picks up problems automatically</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">Track</p>
            <p>Log confidence, time, approach, and more</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">Review</p>
            <p>Spaced repetition tells you when to revisit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
