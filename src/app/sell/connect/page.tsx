"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, BadgeCheck, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormAlert } from "@/components/marketplace/form-alert";
import { FormField } from "@/components/marketplace/form-field";
import { StateMessage } from "@/components/marketplace/state-message";
import { isValidEmail } from "@/lib/utils";

type SellerStatus =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | { status: "redirecting"; url: string }
  | { status: "connected" }
  | { status: "incomplete" }
  | { status: "not-started" };

export default function ConnectStripePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SellerStatus>({ status: "idle" });
  const isSubmitting = status.status === "submitting";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setStatus({ status: "error", message: "Please enter a valid email address" });
      return;
    }

    setStatus({ status: "submitting" });

    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Connect is not enabled for this Stripe account") {
          setStatus({
            status: "error",
            message: "Stripe Connect is not enabled for your account. Please enable it in your Stripe dashboard.",
          });
        } else {
          setStatus({ status: "error", message: data.error || "Failed to connect with Stripe" });
        }
        return;
      }

      // API returns { data: { url } }
      const url = data.data?.url;
      if (url) {
        setStatus({ status: "redirecting", url });
      } else {
        setStatus({ status: "error", message: "No URL returned from Stripe" });
      }
    } catch (err) {
      setStatus({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  if (status.status === "redirecting") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Stripe Onboarding Link</CardTitle>
            <CardDescription className="text-center">
              Click the link below to open Stripe onboarding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="break-all text-sm">{status.url}</p>
            </div>
            <Button asChild className="w-full">
              <a href={status.url} target="_blank" rel="noopener noreferrer">
                Open Stripe Onboarding
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Cancel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status.status === "connected") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <BadgeCheck className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-center">You're connected!</CardTitle>
            <CardDescription className="text-center">
              Your Stripe account is set up and your listings now have Buy Now buttons.
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

  if (status.status === "incomplete") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-center">Almost there</CardTitle>
            <CardDescription className="text-center">
              You started the onboarding process but haven't finished it yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => onSubmit(event as any)} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Resume onboarding
            </Button>
            <Button asChild variant="outline" className="w-full">
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
          <CardTitle>Connect with Stripe</CardTitle>
          <CardDescription>
            Enter your email to start the Stripe onboarding process and enable payments for your listings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField id="email" label="Your email" error={undefined}>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isSubmitting}
              />
            </FormField>
            {status.status === "error" && (
              <FormAlert variant="error" title="Connection failed">
                {status.message}
              </FormAlert>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect with Stripe"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
