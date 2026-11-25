"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "./user-menu";
import { Logo } from "./logo";
import type { EnvPill } from "@/lib/app-env";

// Which deployment you're looking at: green for dev, purple for test, and
// nothing in production.
const ENV_PILL_STYLES: Record<EnvPill, string> = {
  dev: "border-remembered text-remembered",
  test: "border-[#C084FC] text-[#C084FC]",
};

const navItems = [
  { label: "Today", href: "/dashboard" },
  { label: "Problems", href: "/problems" },
  { label: "Review", href: "/review" },
  { label: "Problem Sets", href: "/problem-sets" },
];

export function Nav({ envPill = null }: { envPill?: EnvPill | null }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* flex so the link is exactly the logo's height and the pill centres on it */}
          <Link href="/dashboard" aria-label="LeetPro, today" className="flex items-center rounded-md">
            <Logo />
          </Link>
          {envPill ? (
            <Badge variant="outline" className={cn("bg-transparent text-[11px]", ENV_PILL_STYLES[envPill])}>
              {envPill}
            </Badge>
          ) : null}
        </div>
        <NavLinks pathname={pathname} className="hidden md:flex" />
        <UserMenu />
      </div>
      <NavLinks pathname={pathname} className="flex overflow-x-auto border-t px-2 md:hidden" />
    </header>
  );
}

function NavLinks({ pathname, className }: { pathname: string; className?: string }) {
  return (
    <nav aria-label="Main" className={cn("items-center gap-1", className)}>
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-md px-3 py-2 text-[0.9375rem] whitespace-nowrap transition-colors",
              active
                ? "font-semibold text-foreground after:absolute after:inset-x-3 after:-bottom-[13px] after:h-[3px] after:rounded-full after:bg-primary md:after:-bottom-[15px]"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
