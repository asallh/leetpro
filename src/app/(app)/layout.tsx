import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const showDevPill = (process.env.ENV ?? "").toLowerCase() !== "prod";

  return (
    <>
      <Nav showDevPill={showDevPill} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
        {children}
      </main>
    </>
  );
}
