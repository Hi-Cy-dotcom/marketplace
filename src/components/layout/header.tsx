import { Suspense } from "react";
import Link from "next/link";
import { CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { SearchBar, SearchBarFallback } from "@/components/layout/search-bar";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
      <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-2 px-4 sm:gap-4">
        <Logo />
        <div className="flex flex-1 justify-center">
          <Suspense fallback={<SearchBarFallback className="max-w-xl" />}>
            <SearchBar className="max-w-xl" />
          </Suspense>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
            <Link href="/sell/connect" aria-label="Connect with Stripe">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Sell with Stripe</span>
            </Link>
          </Button>
          <Button asChild className="shrink-0 rounded-full sm:rounded-md">
            <Link href="/create" aria-label="Create new listing">
              <Plus />
              <span className="hidden sm:inline">Create listing</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
