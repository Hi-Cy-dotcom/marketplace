import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/marketplace/state-message";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <StateMessage
        icon={SearchX}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <Button asChild>
            <Link href="/">Back to Marketplace</Link>
          </Button>
        }
      />
    </main>
  );
}
