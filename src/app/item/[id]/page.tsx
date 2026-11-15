import type { Metadata } from "next";
import { ItemDetail } from "@/components/marketplace/item-detail";

interface ItemPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Item details" };

export default async function ItemPage({ params }: ItemPageProps) {
  const { id } = await params;
  return (
    <main>
      <ItemDetail key={id} id={id} />
    </main>
  );
}
