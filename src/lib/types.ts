export type ListingStatus = "available" | "sold";

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  seller_email: string;
  image_url: string | null;
  status: ListingStatus;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  listing_id: string;
  buyer_email: string;
  seller_email: string;
  message: string;
  created_at: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  seller_email: string;
  image_url?: string | null;
}

export interface CreateMessageInput {
  listing_id: string;
  buyer_email: string;
  message: string;
}

export interface Seller {
  email: string;
  stripe_account_id: string;
  charges_enabled: boolean;
  details_submitted: boolean;
  created_at: string;
}

export type OrderStatus = "pending" | "paid" | "needs_review";

export interface Order {
  id: string;
  listing_id: string;
  stripe_account_id: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  amount_total: number;
  application_fee_amount: number;
  currency: string;
  buyer_email: string;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
}

export interface UploadResult {
  url: string;
  path: string;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: Record<string, string>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
