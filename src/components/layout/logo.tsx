import Link from "next/link";
import { Store } from "lucide-react";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Marketplace home"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-facebook text-white">
        <Store className="h-5 w-5" />
      </span>
      <span className="hidden text-xl font-bold tracking-tight text-facebook md:inline">
        Marketplace
      </span>
    </Link>
  );
}
