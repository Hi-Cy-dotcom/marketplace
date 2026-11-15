import type {
  ApiResponse,
  CreateListingInput,
  CreateMessageInput,
  Listing,
  Message,
  UploadResult,
} from "@/lib/types";

/** Error thrown by the browser API client; carries the HTTP status and field errors. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new ApiClientError("Network error. Check your connection and try again.", 0);
  }

  let body: ApiResponse<T> | null = null;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    // Non-JSON response (e.g. a platform error page); handled below.
  }

  if (!response.ok || !body || "error" in body) {
    const message =
      body && "error" in body
        ? body.error
        : response.status === 413
          ? "The file is too large to upload."
          : `Request failed (${response.status})`;
    const details = body && "error" in body ? body.details : undefined;
    throw new ApiClientError(message, response.status, details);
  }

  return body.data;
}

const jsonInit = (data: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export function fetchListings(params: { search?: string; category?: string } = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", params.category);
  const qs = query.toString();
  return request<Listing[]>(`/api/listings${qs ? `?${qs}` : ""}`);
}

export function fetchListing(id: string) {
  return request<Listing>(`/api/listings/${encodeURIComponent(id)}`);
}

export function createListing(input: CreateListingInput) {
  return request<Listing>("/api/listings", jsonInit(input));
}

export function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return request<UploadResult>("/api/upload", { method: "POST", body: formData });
}

export function sendMessage(input: CreateMessageInput) {
  return request<Message>("/api/messages", jsonInit(input));
}
