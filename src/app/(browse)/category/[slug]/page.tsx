import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketplaceBrowser } from "@/components/marketplace/marketplace-browser";
import { ListingGridSkeleton } from "@/components/marketplace/listing-grid";
import { CATEGORIES, getCategory } from "@/lib/categories";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

// "electronics" has its own static page at /category/electronics.
export function generateStaticParams() {
  return CATEGORIES.filter((c) => c.slug !== "electronics").map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  return { title: category ? category.name : "Category not found" };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const Icon = category.icon;

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-facebook text-white">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{category.name}</h1>
          <p className="text-sm text-muted-foreground">
            Browse {category.name.toLowerCase()} for sale near you
          </p>
        </div>
      </div>
      <Suspense fallback={<ListingGridSkeleton />}>
        <MarketplaceBrowser title={`${category.name} listings`} category={category.slug} />
      </Suspense>
    </>
  );
}
