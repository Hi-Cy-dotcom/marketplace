"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert } from "@/components/marketplace/form-alert";
import { FormField } from "@/components/marketplace/form-field";
import { ApiClientError, sendMessage } from "@/lib/api-client";
import type { CreateMessageInput } from "@/lib/types";
import { LIMITS, validateMessageInput, type FieldErrors } from "@/lib/validation";

const DEFAULT_MESSAGE = "Hi, is this still available?";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | { status: "success"; buyerEmail: string };

interface MessageSellerFormProps {
  listingId: string;
  listingTitle: string;
}

export function MessageSellerForm({ listingId, listingTitle }: MessageSellerFormProps) {
  const [buyerEmail, setBuyerEmail] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [errors, setErrors] = useState<FieldErrors<CreateMessageInput>>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const isSubmitting = submitState.status === "submitting";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { value, errors: validationErrors } = validateMessageInput({
      listing_id: listingId,
      buyer_email: buyerEmail,
      message,
    });
    setErrors(validationErrors);
    if (!value) {
      setSubmitState({
        status: "error",
        message: validationErrors.listing_id ?? "Please fix the highlighted fields.",
      });
      return;
    }

    setSubmitState({ status: "submitting" });
    try {
      await sendMessage(value);
      setSubmitState({ status: "success", buyerEmail: value.buyer_email });
      setMessage(DEFAULT_MESSAGE);
    } catch (err) {
      if (err instanceof ApiClientError && err.details) setErrors(err.details);
      setSubmitState({
        status: "error",
        message: err instanceof Error ? err.message : "Couldn't send your message.",
      });
    }
  };

  if (submitState.status === "success") {
    return (
      <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" aria-hidden />
        <p className="mt-2 font-semibold text-green-900">Message sent!</p>
        <p className="mt-1 text-sm text-green-900/80">
          The seller of &ldquo;{listingTitle}&rdquo; will reply to {submitState.buyerEmail}.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setSubmitState({ status: "idle" })}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3" aria-label="Message seller">
      <FormField id="buyer_email" label="Your email" error={errors.buyer_email}>
        <Input
          id="buyer_email"
          type="email"
          autoComplete="email"
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          placeholder="you@example.com"
          aria-invalid={!!errors.buyer_email}
          aria-describedby={errors.buyer_email ? "buyer_email-error" : undefined}
          disabled={isSubmitting}
        />
      </FormField>
      <FormField id="message" label="Message" error={errors.message}>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={LIMITS.messageMax}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "message-error" : undefined}
          disabled={isSubmitting}
        />
      </FormField>
      {submitState.status === "error" && (
        <FormAlert variant="error" title="Message not sent">
          {submitState.message}
        </FormAlert>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
        {isSubmitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
