"use client";

import * as React from "react";
import { Lock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

/**
 * Passcode gate for the admin dashboard.
 *
 * This is a lightweight, client-side lock — it keeps normal users from
 * casually opening `/admin` and touching inventory, not a real security
 * boundary (the mock data lives client-side too). Swap for real auth when
 * the backend lands.
 *
 * Set the passcode via `NEXT_PUBLIC_ADMIN_PASSCODE` in `.env.local`;
 * falls back to the default below.
 */
// Matched case-insensitively (see handleSubmit), so any capitalization works.
const ADMIN_PASSCODE =
  process.env.NEXT_PUBLIC_ADMIN_PASSCODE ?? "statistics";

const UNLOCK_KEY = "stat-admin-unlocked";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState("");
  const [checking, setChecking] = React.useState(false);

  // Restore unlock state from the session (survives navigation, resets on
  // a new tab / full close). Guarded so it only runs on the client.
  React.useEffect(() => {
    if (sessionStorage.getItem(UNLOCK_KEY) === "true") {
      setUnlocked(true);
    }
    setReady(true);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    // Tiny delay so the interaction reads as a real check, not a flicker.
    setTimeout(() => {
      setChecking(false);
      if (value.trim().toLowerCase() === ADMIN_PASSCODE.toLowerCase()) {
        sessionStorage.setItem(UNLOCK_KEY, "true");
        setUnlocked(true);
        setError("");
      } else {
        setError("Incorrect passcode. Please try again.");
        setValue("");
      }
    }, 400);
  }

  // Avoid a hydration flash before we know the session state.
  if (!ready) return null;

  if (unlocked) return <>{children}</>;

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-6 rounded-xl border border-border bg-muted/30 px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
        <Lock className="h-6 w-6" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          Admin Access
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-3 text-left">
        <div className="space-y-1.5">
          <Label htmlFor="admin-passcode">Passcode</Label>
          <Input
            id="admin-passcode"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError("");
            }}
            aria-invalid={!!error}
            placeholder="••••••••"
          />
          <FieldError message={error} />
        </div>
        <Button type="submit" className="w-full" disabled={checking || !value}>
          {checking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Unlock
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
