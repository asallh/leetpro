"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "./user-menu";
import { Logo } from "./logo";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Problems", href: "/problems" },
  { label: "Review", href: "/review" },
  { label: "Lists", href: "/lists" },
];

export function Nav({ showDevPill = false }: { showDevPill?: boolean }) {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" aria-label="LeetPro dashboard" className="text-lg">
              <Logo />
            </Link>
            {showDevPill ? (
              <Badge
                variant="outline"
                className="rounded-full border-[#C084FC] bg-transparent font-mono text-[10px] uppercase tracking-wide text-[#C084FC]"
              >
                dev
              </Badge>
            ) : null}
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
