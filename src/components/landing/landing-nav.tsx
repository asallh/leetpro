"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavBody,
  Navbar,
  NavItems,
} from "@/components/ui/resizable-navbar";
import { cn } from "@/lib/utils";

const ITEMS = [
  { name: "Compare", link: "#compare" },
  { name: "Logging", link: "#logging" },
  { name: "Forgetting curve", link: "#curve" },
];

/** Full-width header that tucks into a floating pill once you scroll. */
export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <Navbar className="fixed top-3">
      <NavBody>
        <Link href="/" aria-label="LeetPro home" className="relative z-20 px-2">
          <Logo />
        </Link>
        <NavItems items={ITEMS} />
        <div className="relative z-20 flex items-center gap-1">
          <Link href="/sign-in" className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link href="/sign-up" className={cn(buttonVariants({ variant: "outline" }), "h-9 rounded-full px-4")}>
            Get started
          </Link>
        </div>
      </NavBody>

      <MobileNav>
        <MobileNavHeader>
          <Link href="/" aria-label="LeetPro home" className="px-2">
            <Logo />
          </Link>
          <MobileNavToggle isOpen={open} onClick={() => setOpen((o) => !o)} />
        </MobileNavHeader>
        <MobileNavMenu isOpen={open} onClose={() => setOpen(false)}>
          {ITEMS.map((item) => (
            <a key={item.link} href={item.link} onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              {item.name}
            </a>
          ))}
          <div className="flex w-full gap-2 pt-2">
            <Link href="/sign-in" className={cn(buttonVariants({ variant: "outline" }), "h-10 flex-1 rounded-full")}>
              Sign in
            </Link>
            <Link href="/sign-up" className={cn(buttonVariants(), "h-10 flex-1 rounded-full")}>
              Get started
            </Link>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
