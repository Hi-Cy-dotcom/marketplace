import { Sidebar } from "@/components/layout/sidebar";
import { CategoryChips } from "@/components/layout/category-chips";

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1920px]">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-4 lg:px-6 lg:py-6">
        <CategoryChips />
        {children}
      </main>
    </div>
  );
}
