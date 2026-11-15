import Link from "next/link";
import { MapPin } from "lucide-react";
import { ListingImage } from "@/components/marketplace/listing-image";
import type { Listing } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

interface ListingCardProps {
  listing: Listing;
  priority?: boolean;
}

export function ListingCard({ listing, priority }: ListingCardProps) {
  return (
    <Link
      href={`/item/${listing.id}`}
      className="group block rounded-lg p-1 transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <ListingImage
          src={listing.image_url}
          alt={listing.title}
          priority={priority}
          sizes="(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="px-1 pb-2 pt-2">
        <p className="text-base font-bold">{formatPrice(listing.price)}</p>
        <h3 className="line-clamp-2 text-[15px] leading-5 group-hover:underline">
          {listing.title}
        </h3>
        <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{listing.location}</span>
        </p>
      </div>
    </Link>
  );
}
