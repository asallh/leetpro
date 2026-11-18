import { getOptionalSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Landing } from "@/components/landing/landing";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const session = await getOptionalSession();
  if (session) redirect("/dashboard");
  return <Landing />;
}
