"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2 text-[15px] font-medium transition-colors hover:bg-secondary",
        active && "bg-secondary",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          active ? "bg-facebook text-white" : "bg-secondary text-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 overflow-y-auto border-r bg-card px-2 py-4 lg:block xl:w-80">
      <h1 className="px-2 text-2xl font-bold">Marketplace</h1>
      <nav className="mt-4 space-y-1" aria-label="Marketplace">
        <NavItem href="/" label="Browse all" icon={Store} active={pathname === "/"} />
      </nav>
      <div className="px-2 pt-4">
        <Button asChild className="w-full">
          <Link href="/create">
            <Plus />
            Create new listing
          </Link>
        </Button>
      </div>
      <Separator className="my-4" />
      <h2 className="px-2 text-lg font-semibold">Categories</h2>
      <nav className="mt-2 space-y-1" aria-label="Categories">
        {CATEGORIES.map((category) => (
          <NavItem
            key={category.slug}
            href={`/category/${category.slug}`}
            label={category.name}
            icon={category.icon}
            active={pathname === `/category/${category.slug}`}
          />
        ))}
      </nav>
    </aside>
  );
}
