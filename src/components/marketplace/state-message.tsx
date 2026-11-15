import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StateMessageProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: "default" | "error";
  className?: string;
}

/** Shared layout for empty, error and not-found states. */
export function StateMessage({
  icon: Icon,
  title,
  description,
  action,
  tone = "default",
  className,
}: StateMessageProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl bg-card px-6 py-16 text-center shadow-sm",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full",
          tone === "error"
            ? "bg-destructive/10 text-destructive"
            : "bg-accent text-accent-foreground",
        )}
      >
        <Icon className="h-8 w-8" aria-hidden />
      </span>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
