export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  seller_email: string;
  image_url: string | null;
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
