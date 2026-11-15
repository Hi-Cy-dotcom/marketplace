import { fail, ok, requireSupabase, serverError } from "@/lib/api-response";
import { LISTING_IMAGES_BUCKET, supabase } from "@/lib/supabase";
import type { UploadResult } from "@/lib/types";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, validateImageFile } from "@/lib/validation";

type AllowedType = (typeof ALLOWED_IMAGE_TYPES)[number];

const EXTENSIONS: Record<AllowedType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Checks the file's magic bytes so a renamed non-image can't slip through. */
function matchesSignature(bytes: Uint8Array, type: AllowedType): boolean {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  switch (type) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  }
}

// POST /api/upload  (multipart/form-data with a `file` field)
export async function POST(request: Request) {
  try {
    const notConfigured = requireSupabase();
    if (notConfigured) return notConfigured;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return fail("Request must be multipart/form-data with a `file` field", 400);
    }

    const file = formData.get("file");
    if (!(file instanceof File)) return fail("A `file` field is required", 400);

    const validationError = validateImageFile(file);
    if (validationError) return fail(validationError, 400, { file: validationError });

    const type = file.type as AllowedType;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > MAX_UPLOAD_BYTES) return fail("Image must be 5MB or smaller", 400);
    if (!matchesSignature(bytes, type)) {
      return fail("File content doesn't match its image type", 400, {
        file: "File content doesn't match its image type",
      });
    }

    const now = new Date();
    const path = `listings/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${EXTENSIONS[type]}`;

    const { error } = await supabase.storage.from(LISTING_IMAGES_BUCKET).upload(path, bytes, {
      contentType: type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) return serverError("POST /api/upload", error);

    const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(path);
    return ok<UploadResult>({ url: data.publicUrl, path }, 201);
  } catch (error) {
    return serverError("POST /api/upload", error);
  }
}
