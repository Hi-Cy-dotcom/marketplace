import { Suspense } from "react";
import { MarketplaceBrowser } from "@/components/marketplace/marketplace-browser";
import { ListingGridSkeleton } from "@/components/marketplace/listing-grid";

export default function HomePage() {
  return (
    <Suspense fallback={<ListingGridSkeleton />}>
      <MarketplaceBrowser title="Today's picks" />
    </Suspense>
  );
}
