"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackButton({ className, fallbackHref = "/" }: { className?: string; fallbackHref?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn("rounded-full", className)}
      aria-label="Go back"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
    >
      <ArrowLeft />
    </Button>
  );
}
