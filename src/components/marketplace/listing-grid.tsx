import { ListingCard } from "@/components/marketplace/listing-card";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

export const GRID_CLASSES =
  "grid grid-cols-1 gap-x-2 gap-y-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

export function ListingGrid({ listings }: { listings: Listing[] }) {
  return (
    <div className={GRID_CLASSES}>
      {listings.map((listing, index) => (
        <ListingCard key={listing.id} listing={listing} priority={index < 4} />
      ))}
    </div>
  );
}

export function ListingGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className={cn(GRID_CLASSES)} aria-busy="true" aria-label="Loading listings">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse p-1">
          <div className="aspect-square rounded-lg bg-muted" />
          <div className="mt-3 h-4 w-16 rounded bg-muted" />
          <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
          <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
