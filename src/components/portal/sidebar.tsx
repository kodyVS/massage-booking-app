"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
}

interface Props {
  title: string;
  subtitle?: string;
  items: NavItem[];
  user?: { email?: string; role?: string };
}

/**
 * Role-aware sidebar shared between admin and worker portals. Mobile uses a
 * collapsible panel toggled by a top bar; desktop pins to the left.
 */
export function Sidebar({ title, subtitle, items, user }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-cream/95 px-4 py-3 ring-1 ring-coral/10 backdrop-blur md:hidden">
        <Link href={items[0]?.href ?? "/"} className="font-display text-xl text-coral-dark">
          {title}
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="portal-sidebar"
          onClick={() => setOpen((p) => !p)}
          className="rounded-lg p-2 text-ink/70 ring-1 ring-coral/20"
        >
          <span className="sr-only">Toggle navigation</span>
          <span className="block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
        </button>
      </header>

      {/* Sidebar */}
      <aside
        id="portal-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col gap-1 border-r border-coral/10 bg-cream/95 px-4 py-6 backdrop-blur transition-transform md:sticky md:top-0 md:flex md:h-screen md:translate-x-0",
          open ? "flex translate-x-0" : "hidden -translate-x-full md:flex",
        )}
      >
        <div className="mb-2 hidden md:block">
          <p className="font-display text-2xl text-coral-dark">{title}</p>
          {subtitle && <p className="text-xs text-ink/60">{subtitle}</p>}
        </div>

        <nav aria-label="Portal navigation" className="flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" &&
                item.href !== "/portal" &&
                pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-coral text-cream font-semibold"
                    : "text-ink/80 hover:bg-blush/50",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="mt-3 border-t border-coral/10 pt-3 text-xs text-ink/65">
            <p className="truncate font-medium text-ink/80">{user.email}</p>
            {user.role && <p className="capitalize text-ink/50">{user.role}</p>}
            <form action="/api/auth/signout" method="post" className="mt-2">
              <button
                type="submit"
                className="text-coral-dark hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </aside>

      {/* Mobile backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-ink/30 md:hidden"
        />
      )}
    </>
  );
}
