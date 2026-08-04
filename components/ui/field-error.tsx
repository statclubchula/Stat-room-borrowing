import { cn } from "@/lib/utils";

/** Small inline validation message shown under a field. */
export function FieldError({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p className={cn("text-xs font-medium text-destructive", className)}>
      {message}
    </p>
  );
}
