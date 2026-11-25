import { Nav } from "@/components/nav";
import { envPill } from "@/lib/app-env";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav envPill={envPill()} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
        {children}
      </main>
    </>
  );
}
