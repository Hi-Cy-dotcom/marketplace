import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import { markOrderPaidFromSession } from "@/lib/stripe-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_status: string;
      payment_intent: string | { id: string } | null;
      metadata: Record<string, string> | null;
      account?: string;
      customer_details: {
        email: string | null;
      } | null;
    };

    // Only process paid sessions
    if (session.payment_status !== "paid") {
      return new Response("OK", { status: 200 });
    }

    const orderId = session.metadata?.order_id;
    if (!orderId) {
      console.error("No order_id in session metadata");
      return new Response("OK", { status: 200 });
    }

    // Load order to verify it belongs to us
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (!order) {
      // Order doesn't belong to us (shared sandbox)
      return new Response("OK", { status: 200 });
    }

    // Verify the account matches (shared sandbox check)
    if (session.account && session.account !== order.stripe_account_id) {
      console.error("Account mismatch for order", orderId);
      return new Response("OK", { status: 200 });
    }

    // Use shared function to mark order as paid
    await markOrderPaidFromSession(session, order.stripe_account_id);
  }

  // Handle account.updated
  if (event.type === "account.updated") {
    const account = event.data.object as {
      id: string;
      charges_enabled: boolean;
      details_submitted: boolean;
    };

    // Update seller record
    const { error } = await supabaseAdmin
      .from("sellers")
      .update({
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
      })
      .eq("stripe_account_id", account.id);

    if (error) {
      // Account doesn't belong to us (shared sandbox)
      console.error("Failed to update seller or account not found:", error);
    }
  }

  return new Response("OK", { status: 200 });
}
