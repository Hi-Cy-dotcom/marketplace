import { CATEGORY_SLUGS } from "@/lib/categories";
import type { CreateListingInput, CreateMessageInput } from "@/lib/types";
import { isValidEmail } from "@/lib/utils";

export const LIMITS = {
  titleMin: 3,
  titleMax: 100,
  descriptionMax: 2000,
  locationMin: 2,
  locationMax: 100,
  emailMax: 254,
  priceMax: 999_999_999,
  messageMin: 2,
  messageMax: 2000,
} as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export interface ValidationResult<T> {
  value: T | null;
  errors: FieldErrors<T>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateEmailField(value: string, label: string): string | undefined {
  if (!value) return `${label} is required`;
  if (value.length > LIMITS.emailMax || !isValidEmail(value)) return "Enter a valid email address";
  return undefined;
}

/** Shared by the create-listing form and `POST /api/listings`. */
export function validateListingInput(input: unknown): ValidationResult<CreateListingInput> {
  const raw = (input ?? {}) as Record<string, unknown>;
  const errors: FieldErrors<CreateListingInput> = {};

  const title = str(raw.title);
  if (!title) errors.title = "Title is required";
  else if (title.length < LIMITS.titleMin)
    errors.title = `Title must be at least ${LIMITS.titleMin} characters`;
  else if (title.length > LIMITS.titleMax)
    errors.title = `Title must be ${LIMITS.titleMax} characters or fewer`;

  const description = str(raw.description);
  if (!description) errors.description = "Description is required";
  else if (description.length > LIMITS.descriptionMax)
    errors.description = `Description must be ${LIMITS.descriptionMax} characters or fewer`;

  const price =
    typeof raw.price === "number"
      ? raw.price
      : typeof raw.price === "string" && raw.price.trim() !== ""
        ? Number(raw.price.replace(/,/g, ""))
        : Number.NaN;
  if (!Number.isFinite(price)) errors.price = "Price is required";
  else if (price < 0) errors.price = "Price can't be negative";
  else if (price > LIMITS.priceMax) errors.price = "Price is too high";

  const category = str(raw.category);
  if (!category) errors.category = "Choose a category";
  else if (!CATEGORY_SLUGS.includes(category)) errors.category = "Choose a valid category";

  const location = str(raw.location);
  if (!location) errors.location = "Location is required";
  else if (location.length < LIMITS.locationMin) errors.location = "Location is too short";
  else if (location.length > LIMITS.locationMax)
    errors.location = `Location must be ${LIMITS.locationMax} characters or fewer`;

  const seller_email = str(raw.seller_email).toLowerCase();
  const emailError = validateEmailField(seller_email, "Email");
  if (emailError) errors.seller_email = emailError;

  let image_url: string | null = null;
  if (raw.image_url !== undefined && raw.image_url !== null && raw.image_url !== "") {
    const candidate = str(raw.image_url);
    try {
      const url = new URL(candidate);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
      image_url = candidate;
    } catch {
      errors.image_url = "Image URL is invalid";
    }
  }

  if (Object.keys(errors).length > 0) return { value: null, errors };
  return {
    value: {
      title,
      description,
      price: Math.round(price * 100) / 100,
      category,
      location,
      seller_email,
      image_url,
    },
    errors,
  };
}

/** Shared by the message-seller form and `POST /api/messages`. */
export function validateMessageInput(input: unknown): ValidationResult<CreateMessageInput> {
  const raw = (input ?? {}) as Record<string, unknown>;
  const errors: FieldErrors<CreateMessageInput> = {};

  const listing_id = str(raw.listing_id);
  if (!isUuid(listing_id)) errors.listing_id = "A valid listing_id is required";

  const buyer_email = str(raw.buyer_email).toLowerCase();
  const emailError = validateEmailField(buyer_email, "Your email");
  if (emailError) errors.buyer_email = emailError;

  const message = str(raw.message);
  if (!message) errors.message = "Message is required";
  else if (message.length < LIMITS.messageMin) errors.message = "Message is too short";
  else if (message.length > LIMITS.messageMax)
    errors.message = `Message must be ${LIMITS.messageMax} characters or fewer`;

  if (Object.keys(errors).length > 0) return { value: null, errors };
  return { value: { listing_id, buyer_email, message }, errors };
}

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type))
    return "Only JPEG, PNG or WebP images are allowed";
  if (file.size > MAX_UPLOAD_BYTES) return "Image must be 5MB or smaller";
  if (file.size === 0) return "Image file is empty";
  return null;
}
