import { redirect } from "next/navigation";
import { BadgeCheck, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import type { Seller } from "@/lib/types";

interface ReturnPageProps {
  searchParams: { account_id?: string };
}

export default async function StripeConnectReturnPage({ searchParams }: ReturnPageProps) {
  const { account_id: accountId } = await searchParams;

  if (!accountId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Invalid return</CardTitle>
            <CardDescription className="text-center">
              No account ID provided. Please try connecting again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/sell/connect">Try again</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch the account from Stripe to get actual status
  let account;
  try {
    account = await stripe.accounts.retrieve(accountId);
  } catch (error) {
    console.error("Failed to retrieve Stripe account:", error);
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-center">Error loading account</CardTitle>
            <CardDescription className="text-center">
              We couldn't load your Stripe account. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/sell/connect">Try again</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Update seller record with current status
  const { data: seller } = await supabaseAdmin
    .from("sellers")
    .select("*")
    .eq("stripe_account_id", accountId)
    .maybeSingle();

  if (seller) {
    await supabaseAdmin
      .from("sellers")
      .update({
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
      })
      .eq("email", seller.email);
  }

  const isChargesEnabled = account.charges_enabled;
  const isDetailsSubmitted = account.details_submitted;

  if (isChargesEnabled && isDetailsSubmitted) {
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
              <a href="/">Back to Marketplace</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isDetailsSubmitted && !isChargesEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-center">Almost there</CardTitle>
            <CardDescription className="text-center">
              You've submitted your details, but charges aren't enabled yet. This may take a few hours for Stripe to review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/">Back to Marketplace</a>
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
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-center">Finish onboarding</CardTitle>
          <CardDescription className="text-center">
            You haven't completed the onboarding process yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={async () => {
              "use server";
              const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/sell/connect`,
                return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/sell/connect/return?account_id=${accountId}`,
                type: "account_onboarding",
              });
              redirect(accountLink.url);
            }}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Resume onboarding
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href="/">Back to Marketplace</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
