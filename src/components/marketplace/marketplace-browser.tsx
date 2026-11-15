"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, PackageSearch, Plus, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingGrid, ListingGridSkeleton } from "@/components/marketplace/listing-grid";
import { StateMessage } from "@/components/marketplace/state-message";
import { fetchListings } from "@/lib/api-client";
import type { Listing } from "@/lib/types";

interface MarketplaceBrowserProps {
  title: string;
  category?: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; key: string; error: string }
  | { status: "success"; key: string; listings: Listing[] };

export function MarketplaceBrowser({ title, category }: MarketplaceBrowserProps) {
  const searchParams = useSearchParams();
  const search = searchParams.get("search")?.trim() ?? "";
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<LoadState>({ status: "loading" });
  const queryKey = `${category ?? ""}|${search}|${reloadKey}`;
  // Results from a previous query are treated as loading until the new query resolves.
  const state: LoadState =
    result.status !== "loading" && result.key === queryKey ? result : { status: "loading" };

  useEffect(() => {
    let cancelled = false;
    fetchListings({ search, category })
      .then((listings) => {
        if (!cancelled) setResult({ status: "success", key: queryKey, listings });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setResult({
            status: "error",
            key: queryKey,
            error: err instanceof Error ? err.message : "Something went wrong",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [search, category, queryKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const clearSearchHref = category ? `/category/${category}` : "/";

  return (
    <section aria-labelledby="listings-heading">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="listings-heading" className="text-xl font-bold">
          {search ? <>Results for &ldquo;{search}&rdquo;</> : title}
        </h2>
        {state.status === "success" && (
          <p className="text-sm text-muted-foreground">
            {state.listings.length} {state.listings.length === 1 ? "listing" : "listings"}
          </p>
        )}
      </div>

      {state.status === "loading" && <ListingGridSkeleton />}

      {state.status === "error" && (
        <StateMessage
          tone="error"
          icon={AlertTriangle}
          title="Couldn't load listings"
          description={state.error}
          action={
            <Button onClick={retry}>
              <RotateCw />
              Try again
            </Button>
          }
        />
      )}

      {state.status === "success" && state.listings.length === 0 && (
        <StateMessage
          icon={PackageSearch}
          title={search ? "No results found" : "No listings yet"}
          description={
            search
              ? "Try a different keyword or browse another category."
              : "Be the first to list something here."
          }
          action={
            <>
              {search && (
                <Button asChild variant="secondary">
                  <Link href={clearSearchHref}>Clear search</Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/create/item">
                  <Plus />
                  Create listing
                </Link>
              </Button>
            </>
          }
        />
      )}

      {state.status === "success" && state.listings.length > 0 && (
        <ListingGrid listings={state.listings} />
      )}
    </section>
  );
}
