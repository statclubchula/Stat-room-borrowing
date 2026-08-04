"use client";

import * as React from "react";
import { CheckCircle2, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ToastData {
  title: string;
  description?: string;
}

/**
 * Minimal, dependency-free success toast. Renders fixed at the bottom-right
 * and auto-dismisses. Pass `toast={null}` to hide.
 */
export function SuccessToast({
  toast,
  onClose,
  duration = 4000,
}: {
  toast: ToastData | null;
  onClose: () => void;
  duration?: number;
}) {
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [toast, onClose, duration]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div
        role="status"
        className={cn(
          "flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-card p-4 shadow-glow",
          "animate-in slide-in-from-bottom-4 fade-in"
        )}
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {toast.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
