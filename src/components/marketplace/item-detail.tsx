"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Lock, Loader2, Mail, MapPin, PackageX, RotateCw, Tag } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BackButton } from "@/components/marketplace/back-button";
import { ListingImage } from "@/components/marketplace/listing-image";
import { MessageSellerForm } from "@/components/marketplace/message-seller-form";
import { StateMessage } from "@/components/marketplace/state-message";
import { ApiClientError, fetchListing } from "@/lib/api-client";
import { getCategoryName } from "@/lib/categories";
import type { Listing } from "@/lib/types";
import { formatPrice, timeAgo } from "@/lib/utils";

type LoadState =
  | { status: "loading" }
  | { status: "not-found"; key: number }
  | { status: "error"; key: number; error: string }
  | { status: "success"; key: number; listing: Listing };

type CanBuyState =
  | { status: "loading" }
  | { status: "unknown" }
  | { status: "can_buy" }
  | { status: "sold" }
  | { status: "price_too_low" }
  | { status: "seller_not_onboarded" };

function initials(email: string) {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase() || "?";
}

export function ItemDetail({ id }: { id: string }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<LoadState>({ status: "loading" });
  const [canBuyState, setCanBuyState] = useState<CanBuyState>({ status: "loading" });
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const state: LoadState =
    result.status !== "loading" && result.key === reloadKey ? result : { status: "loading" };

  useEffect(() => {
    let cancelled = false;
    fetchListing(id)
      .then((listing) => {
        if (!cancelled) setResult({ status: "success", key: reloadKey, listing });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 404) {
          setResult({ status: "not-found", key: reloadKey });
        } else {
          setResult({
            status: "error",
            key: reloadKey,
            error: err instanceof Error ? err.message : "Something went wrong",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  useEffect(() => {
    if (state.status !== "success") return;

    const checkCanBuy = async () => {
      try {
        const response = await fetch(`/api/listings/${id}/can-buy`);
        if (response.ok) {
          const data = await response.json();
          // API returns { data: { canBuy, reason } }
          const canBuy = data.data?.canBuy;
          const reason = data.data?.reason;
          setCanBuyState({ status: canBuy ? "can_buy" : reason });
        } else {
          setCanBuyState({ status: "unknown" });
        }
      } catch (err) {
        setCanBuyState({ status: "unknown" });
      }
    };

    checkCanBuy();
  }, [id, state.status]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const handleBuyNow = async () => {
    if (isCheckingOut) return;
    setIsCheckingOut(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: id }),
      });

      const data = await response.json();

      // API returns { data: { url } }
      const url = data.data?.url;
      if (response.ok && url) {
        window.location.href = url;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch (err) {
      alert("Something went wrong");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (state.status === "loading") return <ItemDetailSkeleton />;

  if (state.status === "not-found" || state.status === "error") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <BackButton className="mb-4" />
        {state.status === "not-found" ? (
          <StateMessage
            icon={PackageX}
            title="This listing isn't available"
            description="It may have been sold or removed, or the link might be incorrect."
            action={
              <Button asChild>
                <Link href="/">Browse Marketplace</Link>
              </Button>
            }
          />
        ) : (
          <StateMessage
            tone="error"
            icon={AlertTriangle}
            title="Couldn't load this listing"
            description={state.error}
            action={
              <Button onClick={retry}>
                <RotateCw />
                Try again
              </Button>
            }
          />
        )}
      </div>
    );
  }

  const { listing } = state;

  const isSold = listing.status === "sold";
  const canBuy = canBuyState.status === "can_buy";

  return (
    <div className="lg:grid lg:h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="relative aspect-square bg-neutral-900 sm:aspect-[4/3] lg:aspect-auto lg:h-full">
        <ListingImage
          src={listing.image_url}
          alt={listing.title}
          priority
          sizes="(min-width: 1024px) 70vw, 100vw"
          className="object-contain"
        />
        {isSold && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Badge className="text-lg px-6 py-2">Sold</Badge>
          </div>
        )}
        <BackButton className="absolute left-4 top-4 bg-card/90 shadow hover:bg-card" />
      </div>

      <aside className="bg-card lg:overflow-y-auto lg:border-l">
        <div className="space-y-4 p-4 sm:p-6">
          <div>
            <h1 className="break-words text-2xl font-bold">{listing.title}</h1>
            <p className="mt-1 text-xl font-semibold">{formatPrice(listing.price)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                Listed {timeAgo(listing.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {listing.location}
              </span>
            </div>
            <Link href={`/category/${listing.category}`} className="mt-3 inline-block">
              <Badge variant="secondary" className="gap-1 hover:bg-secondary/70">
                <Tag className="h-3 w-3" aria-hidden />
                {getCategoryName(listing.category)}
              </Badge>
            </Link>
          </div>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold">Details</h2>
            <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-6">
              {listing.description}
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold">Seller information</h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-facebook font-semibold text-white">
                  {initials(listing.seller_email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{listing.seller_email.split("@")[0]}</p>
                <a
                  href={`mailto:${listing.seller_email}?subject=${encodeURIComponent(`Marketplace: ${listing.title}`)}`}
                  className="flex items-center gap-1 break-all text-sm text-facebook hover:underline"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {listing.seller_email}
                </a>
              </div>
            </div>
          </section>

          <Separator />

          {!isSold && (
            <section>
              {canBuy ? (
                <Button
                  onClick={handleBuyNow}
                  disabled={isCheckingOut}
                  className="w-full"
                  size="lg"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting checkout...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Buy Now
                    </>
                  )}
                </Button>
              ) : canBuyState.status === "seller_not_onboarded" ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-900">
                    Seller hasn't enabled payments yet.{" "}
                    <Link href="/sell/connect" className="font-semibold underline">
                      Are you the seller?
                    </Link>
                  </p>
                </div>
              ) : canBuyState.status === "price_too_low" ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-900">
                    This item's price is too low for Stripe processing.
                  </p>
                </div>
              ) : null}
            </section>
          )}

          <Separator />

          <section aria-labelledby="message-seller-heading">
            <h2 id="message-seller-heading" className="mb-3 text-lg font-semibold">
              {isSold ? "This item has been sold" : "Send seller a message"}
            </h2>
            {isSold ? (
              <div className="rounded-lg border border-muted bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                This item is no longer available.
              </div>
            ) : (
              <MessageSellerForm listingId={listing.id} listingTitle={listing.title} />
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

export function ItemDetailSkeleton() {
  return (
    <div
      className="animate-pulse lg:grid lg:h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]"
      aria-busy="true"
      aria-label="Loading listing"
    >
      <div className="aspect-square bg-neutral-300 sm:aspect-[4/3] lg:aspect-auto lg:h-full" />
      <div className="space-y-4 bg-card p-6">
        <div className="h-7 w-3/4 rounded bg-muted" />
        <div className="h-6 w-24 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-24 w-full rounded bg-muted" />
        <div className="h-12 w-2/3 rounded bg-muted" />
        <div className="h-32 w-full rounded bg-muted" />
      </div>
    </div>
  );
}
