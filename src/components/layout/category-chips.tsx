"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

/** Horizontal category scroller shown in place of the sidebar on small screens. */
export function CategoryChips() {
  const pathname = usePathname();
  const chips = [{ slug: "", name: "All" }, ...CATEGORIES];

  return (
    <nav
      aria-label="Categories"
      className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((chip) => {
        const href = chip.slug ? `/category/${chip.slug}` : "/";
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-facebook text-white"
                : "bg-card text-foreground shadow-sm hover:bg-secondary",
            )}
          >
            {chip.name}
          </Link>
        );
      })}
    </nav>
  );
}
