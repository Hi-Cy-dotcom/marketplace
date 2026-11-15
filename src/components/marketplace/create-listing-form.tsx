"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormAlert } from "@/components/marketplace/form-alert";
import { FormField } from "@/components/marketplace/form-field";
import { ImageDropzone, type SelectedPhoto } from "@/components/marketplace/image-dropzone";
import { ListingPreview } from "@/components/marketplace/listing-preview";
import { ApiClientError, createListing, uploadImage } from "@/lib/api-client";
import { CATEGORIES } from "@/lib/categories";
import { prepareImageForUpload } from "@/lib/image";
import type { CreateListingInput, Listing } from "@/lib/types";
import { formatPriceInput, parsePriceInput } from "@/lib/utils";
import { LIMITS, validateListingInput, type FieldErrors } from "@/lib/validation";

interface FormValues {
  title: string;
  price: string;
  category: string;
  location: string;
  description: string;
  seller_email: string;
}

type FieldName = keyof FormValues | "image";

const INITIAL_VALUES: FormValues = {
  title: "",
  price: "",
  category: "",
  location: "",
  description: "",
  seller_email: "",
};

type SubmitState =
  | { status: "idle" }
  | { status: "submitting"; step: "uploading" | "saving" }
  | { status: "error"; message: string }
  | { status: "success"; listing: Listing };

function getErrors(values: FormValues, photo: SelectedPhoto | null) {
  const { errors } = validateListingInput({ ...values, price: values.price.replace(/,/g, "") });
  const all: FieldErrors<CreateListingInput> & { image?: string } = { ...errors };
  // Don't add image error here - check photo separately in onSubmit
  return all;
}

export function CreateListingForm() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const photoRef = useRef<SelectedPhoto | null>(null);

  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);

  useEffect(() => {
    return () => {
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.url);
    };
  }, []);

  const errors = getErrors(values, photo);
  const isSubmitting = submitState.status === "submitting";

  const fieldError = (name: FieldName): string | undefined => {
    if (serverErrors[name]) return serverErrors[name];
    const key = name as keyof typeof errors;
    return touched[name] || submitAttempted ? errors[key] : undefined;
  };

  const setField = <K extends keyof FormValues>(name: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (serverErrors[name]) {
      setServerErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const touch = (name: FieldName) => setTouched((prev) => ({ ...prev, [name]: true }));

  const updatePhoto = (next: SelectedPhoto | null) => {
    if (photo && photo.url !== next?.url) URL.revokeObjectURL(photo.url);
    setPhoto(next);
    touch("image");
  };

  const resetForm = () => {
    updatePhoto(null);
    setValues(INITIAL_VALUES);
    setTouched({});
    setSubmitAttempted(false);
    setServerErrors({});
    setSubmitState({ status: "idle" });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    if (Object.keys(errors).length > 0 || !photo) {
      setSubmitState({ status: "error", message: "Please fix the highlighted fields." });
      return;
    }

    try {
      setSubmitState({ status: "submitting", step: "uploading" });
      const upload = await uploadImage(await prepareImageForUpload(photo.file));
      setSubmitState({ status: "submitting", step: "saving" });
      const listing = await createListing({
        title: values.title.trim(),
        description: values.description.trim(),
        price: parsePriceInput(values.price),
        category: values.category,
        location: values.location.trim(),
        seller_email: values.seller_email.trim(),
        image_url: upload.url,
      });
      setSubmitState({ status: "success", listing });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ApiClientError && err.details) {
        const { file: imageError, ...rest } = err.details;
        setServerErrors(imageError ? { ...rest, image: imageError } : rest);
      }
      setSubmitState({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    }
  };

  if (submitState.status === "success") {
    const { listing } = submitState;
    return (
      <div className="mx-auto max-w-xl">
        <FormAlert variant="success" title="Your listing is live!">
          <p>
            &ldquo;{listing.title}&rdquo; has been published to Marketplace. Buyers can now find it
            and message you at {listing.seller_email}.
          </p>
        </FormAlert>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href={`/item/${listing.id}`}>View listing</Link>
          </Button>
          <Button variant="secondary" className="flex-1" onClick={resetForm}>
            <Plus />
            Create another
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/">Back to Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  const priceNumber = parsePriceInput(values.price);
  const describedBy = (name: FieldName) => (fieldError(name) ? `${name}-error` : undefined);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)] xl:gap-8">
      <Card className="p-4 sm:p-6">
        <Link
          href="/create"
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Listing type
        </Link>
        <h1 className="text-2xl font-bold">Item for sale</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Fill in the details below. Fields are required unless marked optional.
        </p>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <ImageDropzone
            photo={photo}
            onChange={updatePhoto}
            error={fieldError("image")}
            disabled={isSubmitting}
          />

          <FormField id="title" label="Title" error={fieldError("title")}>
            <Input
              id="title"
              value={values.title}
              onChange={(e) => setField("title", e.target.value)}
              onBlur={() => touch("title")}
              maxLength={LIMITS.titleMax}
              placeholder="What are you selling?"
              aria-invalid={!!fieldError("title")}
              aria-describedby={describedBy("title")}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField id="price" label="Price" error={fieldError("price")} hint="Enter 0 to list it for free">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                inputMode="decimal"
                value={values.price}
                onChange={(e) => setField("price", formatPriceInput(e.target.value))}
                onBlur={() => touch("price")}
                placeholder="0.00"
                className="pl-7"
                aria-invalid={!!fieldError("price")}
                aria-describedby={describedBy("price")}
                disabled={isSubmitting}
              />
            </div>
          </FormField>

          <FormField id="category" label="Category" error={fieldError("category")}>
            <Select
              value={values.category}
              onValueChange={(value) => {
                setField("category", value);
                touch("category");
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="category"
                aria-invalid={!!fieldError("category")}
                aria-describedby={describedBy("category")}
                className="bg-background"
              >
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category.slug} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField id="location" label="Location" error={fieldError("location")}>
            <Input
              id="location"
              value={values.location}
              onChange={(e) => setField("location", e.target.value)}
              onBlur={() => touch("location")}
              maxLength={LIMITS.locationMax}
              placeholder="City, State"
              aria-invalid={!!fieldError("location")}
              aria-describedby={describedBy("location")}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            id="description"
            label="Description"
            error={fieldError("description")}
            hint={`${values.description.length}/${LIMITS.descriptionMax}`}
          >
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
              onBlur={() => touch("description")}
              maxLength={LIMITS.descriptionMax}
              rows={5}
              placeholder="Describe the condition, features and anything buyers should know."
              aria-invalid={!!fieldError("description")}
              aria-describedby={describedBy("description")}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            id="seller_email"
            label="Your email"
            error={fieldError("seller_email")}
            hint="Buyers' messages will be sent to this address."
          >
            <Input
              id="seller_email"
              type="email"
              autoComplete="email"
              value={values.seller_email}
              onChange={(e) => setField("seller_email", e.target.value)}
              onBlur={() => touch("seller_email")}
              placeholder="you@example.com"
              aria-invalid={!!fieldError("seller_email")}
              aria-describedby={describedBy("seller_email")}
              disabled={isSubmitting}
            />
          </FormField>

          {submitState.status === "error" && (
            <FormAlert variant="error" title="Couldn't publish listing">
              {submitState.message}
            </FormAlert>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                {submitState.step === "uploading" ? "Uploading photo…" : "Publishing…"}
              </>
            ) : (
              "Publish"
            )}
          </Button>
        </form>
      </Card>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <ListingPreview
          imageUrl={photo?.url ?? null}
          title={values.title.trim()}
          price={values.price ? priceNumber : Number.NaN}
          description={values.description.trim()}
          category={values.category}
          location={values.location.trim()}
          sellerEmail={values.seller_email.trim()}
        />
      </div>
    </div>
  );
}
