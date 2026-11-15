import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormAlertProps {
  variant: "success" | "error";
  title: string;
  children?: ReactNode;
  className?: string;
}

export function FormAlert({ variant, title, children, className }: FormAlertProps) {
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-sm",
        variant === "success"
          ? "border-green-200 bg-green-50 text-green-900"
          : "border-destructive/30 bg-destructive/5 text-destructive",
        className,
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 text-foreground/80">{children}</div>}
      </div>
    </div>
  );
}
