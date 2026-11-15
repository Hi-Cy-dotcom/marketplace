import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Car, ChevronRight, Home, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Create new listing" };

const LISTING_TYPES = [
  {
    title: "Item for sale",
    description: "Create a single listing for one or more items to sell.",
    icon: Tag,
    href: "/create/item",
  },
  {
    title: "Vehicle for sale",
    description: "Sell a car, truck or other type of vehicle.",
    icon: Car,
    href: null,
  },
  {
    title: "Home for sale or rent",
    description: "List a house or apartment for sale or rent.",
    icon: Home,
    href: null,
  },
] as const;

export default function CreatePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>
      <h1 className="text-2xl font-bold sm:text-3xl">Choose listing type</h1>
      <p className="mt-1 text-muted-foreground">What would you like to sell?</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {LISTING_TYPES.map(({ title, description, icon: Icon, href }) => {
          const content = (
            <>
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-facebook transition-colors group-hover:bg-facebook group-hover:text-white">
                <Icon className="h-8 w-8" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              {href ? (
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-facebook">
                  Get started <ChevronRight className="h-4 w-4" />
                </span>
              ) : (
                <Badge variant="secondary" className="mt-4">
                  Coming soon
                </Badge>
              )}
            </>
          );
          const className = cn(
            "group flex flex-col items-center rounded-xl border bg-card p-6 text-center shadow-sm transition-all",
            href
              ? "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              : "cursor-not-allowed opacity-60",
          );
          return href ? (
            <Link key={title} href={href} className={className}>
              {content}
            </Link>
          ) : (
            <div key={title} className={className} aria-disabled="true">
              {content}
            </div>
          );
        })}
      </div>
    </main>
  );
}
