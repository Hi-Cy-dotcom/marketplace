import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListingImageProps {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}

const OPTIMIZABLE_HOSTS = [/\.supabase\.co$/];

function canOptimize(src: string): boolean {
  try {
    const { hostname, protocol } = new URL(src);
    return protocol === "https:" && OPTIMIZABLE_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}

export function ListingImage({ src, alt, sizes, className, priority }: ListingImageProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="h-10 w-10" aria-hidden />
        <span className="sr-only">No image</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!canOptimize(src)}
      className={cn("object-cover", className)}
    />
  );
}
