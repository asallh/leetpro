import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const showDevPill = (process.env.ENV ?? "").toLowerCase() !== "prod";

  return (
    <>
      <Nav showDevPill={showDevPill} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}
