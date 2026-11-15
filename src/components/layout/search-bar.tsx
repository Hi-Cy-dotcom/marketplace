"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get("search") ?? "";
  const [value, setValue] = useState(currentSearch);
  const [syncedSearch, setSyncedSearch] = useState(currentSearch);

  // Keep the input in sync when the URL changes (e.g. back/forward navigation).
  if (currentSearch !== syncedSearch) {
    setSyncedSearch(currentSearch);
    setValue(currentSearch);
  }

  const navigate = (term: string) => {
    const basePath = pathname.startsWith("/category/") ? pathname : "/";
    const params = new URLSearchParams();
    const trimmed = term.trim();
    if (trimmed) params.set("search", trimmed);
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(value);
  };

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={cn("relative w-full", className)}
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search Marketplace"
        aria-label="Search Marketplace"
        className="h-10 w-full rounded-full border-0 bg-secondary pl-9 pr-9 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            if (currentSearch) navigate("");
          }}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted-foreground/10"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}

export function SearchBarFallback({ className }: SearchBarProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <div className="h-10 w-full rounded-full bg-secondary" />
    </div>
  );
}
