import Image from "next/image";
import { ImageIcon, Mail, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCategoryName } from "@/lib/categories";
import { cn, formatPrice } from "@/lib/utils";

interface ListingPreviewProps {
  imageUrl: string | null;
  title: string;
  price: number;
  description: string;
  category: string;
  location: string;
  sellerEmail: string;
}

/** Live preview of how the listing will look, updated as the seller types. */
export function ListingPreview({
  imageUrl,
  title,
  price,
  description,
  category,
  location,
  sellerEmail,
}: ListingPreviewProps) {
  const hasPrice = Number.isFinite(price);

  return (
    <Card className="overflow-hidden" aria-label="Listing preview">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">Preview</h2>
        <span className="text-xs text-muted-foreground">Updates as you type</span>
      </div>
      <div className="relative aspect-[4/3] bg-muted">
        {imageUrl ? (
          <Image src={imageUrl} alt="Listing photo preview" fill unoptimized className="object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="h-10 w-10" aria-hidden />
            <p className="text-sm">Your photo will appear here</p>
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <h3
          className={cn(
            "break-words text-xl font-bold",
            !title && "text-muted-foreground",
          )}
        >
          {title || "Title"}
        </h3>
        <p className={cn("text-lg font-semibold", !hasPrice && "text-muted-foreground")}>
          {hasPrice ? formatPrice(price) : "Price"}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {category && <Badge variant="secondary">{getCategoryName(category)}</Badge>}
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {location || "Location"}
          </span>
        </div>
        <Separator className="my-2" />
        <h4 className="text-sm font-semibold">Details</h4>
        <p
          className={cn(
            "whitespace-pre-line break-words text-sm",
            !description && "text-muted-foreground",
          )}
        >
          {description || "Description will appear here."}
        </p>
        <Separator className="my-2" />
        <p className="flex items-center gap-2 break-all text-sm text-muted-foreground">
          <Mail className="h-4 w-4 shrink-0" aria-hidden />
          {sellerEmail || "your@email.com"}
        </p>
      </div>
    </Card>
  );
}
