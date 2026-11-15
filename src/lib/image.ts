const MAX_DIMENSION = 2048;
const COMPRESS_THRESHOLD_BYTES = 1.5 * 1024 * 1024;

/**
 * Downscales large photos in the browser before upload. Phone photos are often
 * 3-5MB, and serverless platforms such as Vercel cap request bodies at ~4.5MB.
 * Returns the original file when it is already small or compression fails.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD_BYTES || typeof createImageBitmap !== "function") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
