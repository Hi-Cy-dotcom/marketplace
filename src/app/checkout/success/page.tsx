"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingImage } from "@/components/marketplace/listing-image";
import { formatPrice } from "@/lib/utils";

interface OrderStatus {
  status: "pending" | "paid" | "needs_review";
  listingTitle: string;
  listingImage: string | null;
  amountTotal: number;
  currency: string;
}

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = use(searchParams);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/by-session?session_id=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          // API returns { data: { ... } }
          const orderData = data.data || data;
          setOrderStatus(orderData);
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Poll for payment confirmation if still pending
    const pollInterval = setInterval(async () => {
      if (orderStatus?.status === "pending" && !polling) {
        setPolling(true);
        try {
          const response = await fetch(`/api/orders/by-session?session_id=${sessionId}`);
          if (response.ok) {
            const data = await response.json();
            // API returns { data: { ... } }
            const orderData = data.data || data;
            setOrderStatus(orderData);
            if (orderData.status !== "pending") {
              clearInterval(pollInterval);
            }
          }
        } catch (err) {
          console.error("Poll error:", err);
        } finally {
          setPolling(false);
        }
      }
    }, 2000);

    // Stop polling after 30 seconds and show timeout message
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setTimedOut(true);
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [sessionId, orderStatus?.status, polling]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!sessionId || !orderStatus || orderStatus.amountTotal == null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Order not found</CardTitle>
            <CardDescription className="text-center">
              We couldn't find your order. Please check your email for confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Back to Marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderStatus.status === "pending") {
    if (timedOut) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <CardTitle className="text-center">Still confirming your payment...</CardTitle>
              <CardDescription className="text-center">
                Your payment is being processed. Check back shortly or contact support if this persists.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/">Back to Marketplace</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
            </div>
            <CardTitle className="text-center">Confirming your payment...</CardTitle>
            <CardDescription className="text-center">
              We're processing your payment. This usually takes a few seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Back to Marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderStatus.status === "needs_review") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Payment under review</CardTitle>
            <CardDescription className="text-center">
              Your payment is being reviewed. We'll send you an email confirmation shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Back to Marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-center">Payment successful!</CardTitle>
          <CardDescription className="text-center">
            You've purchased {orderStatus.listingTitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderStatus.listingImage && (
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
              <ListingImage
                src={orderStatus.listingImage}
                alt={orderStatus.listingTitle}
                sizes="400px"
                className="h-full w-full object-contain"
              />
            </div>
          )}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount paid</span>
              <span className="font-semibold">{formatPrice(orderStatus.amountTotal / 100, orderStatus.currency)}</span>
            </div>
          </div>
          <Button asChild className="w-full">
            <Link href="/">Back to Marketplace</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
