import { Suspense } from "react";
import type { Metadata } from "next";
import { Headphones, Laptop, Smartphone, Tv } from "lucide-react";
import { MarketplaceBrowser } from "@/components/marketplace/marketplace-browser";
import { ListingGridSkeleton } from "@/components/marketplace/listing-grid";

export const metadata: Metadata = {
  title: "Electronics",
  description: "Phones, laptops, audio, TVs and more from sellers near you.",
};

const HIGHLIGHTS = [
  { label: "Phones", icon: Smartphone },
  { label: "Laptops", icon: Laptop },
  { label: "Audio", icon: Headphones },
  { label: "TVs", icon: Tv },
];

/**
 * Example of a hand-crafted static category page. Static segments take
 * precedence over the dynamic `/category/[slug]` route.
 */
export default function ElectronicsPage() {
  return (
    <>
      <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-r from-facebook to-sky-500 p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-white/80">Category</p>
        <h1 className="mt-1 text-3xl font-bold">Electronics</h1>
        <p className="mt-2 max-w-xl text-white/90">
          Find great deals on phones, laptops, headphones, TVs and more from people in your
          community.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {HIGHLIGHTS.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
      <Suspense fallback={<ListingGridSkeleton />}>
        <MarketplaceBrowser title="Electronics listings" category="electronics" />
      </Suspense>
    </>
  );
}
