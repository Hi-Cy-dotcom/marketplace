import type { Metadata } from "next";
import { CreateListingForm } from "@/components/marketplace/create-listing-form";

export const metadata: Metadata = { title: "Item for sale" };

export default function CreateItemPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <CreateListingForm />
    </main>
  );
}
