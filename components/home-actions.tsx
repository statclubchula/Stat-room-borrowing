"use client";

import * as React from "react";
import {
  PackageOpen,
  Undo2,
  ArrowLeft,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BorrowForm } from "@/components/borrow-form";
import { ReturnForm } from "@/components/return-form";

/** Club Linktree — all contact channels live here. */
const LINKTREE_URL = "https://linktr.ee/statclub.cu";

type ActionKey = "borrow" | "return";

interface ActionDef {
  key: ActionKey;
  icon: LucideIcon;
  title: string; // English
  titleTh: string; // Thai
  /** Tailwind accent classes for the icon badge. */
  accent: string;
}

const ACTIONS: ActionDef[] = [
  {
    key: "borrow",
    icon: PackageOpen,
    title: "Borrow",
    titleTh: "ยืมอุปกรณ์",
    accent: "bg-primary/10 text-primary ring-primary/20",
  },
  {
    key: "return",
    icon: Undo2,
    title: "Return",
    titleTh: "คืนอุปกรณ์",
    accent: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
  },
];

export function HomeActions() {
  const [active, setActive] = React.useState<ActionKey | null>(null);
  const activeDef = ACTIONS.find((a) => a.key === active) ?? null;

  return (
    <div className="mt-12">
      {/* ---- Action cards grid ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const isActive = action.key === active;
          return (
            <button
              key={action.key}
              type="button"
              onClick={() => setActive(action.key)}
              aria-pressed={isActive}
              className={cn(
                "group text-left transition-transform focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl",
                "hover:-translate-y-1"
              )}
            >
              <Card
                className={cn(
                  "h-full transition-colors",
                  isActive
                    ? "border-primary/60 shadow-glow"
                    : "hover:border-primary/40"
                )}
              >
                <CardHeader className="gap-3">
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-lg ring-1",
                      action.accent
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {action.titleTh}
                    </p>
                  </div>
                </CardHeader>
              </Card>
            </button>
          );
        })}
      </div>

      {/* ---- Selected action view ---- */}
      {activeDef && (
        <div className="mt-8">
          <ActionView def={activeDef} onBack={() => setActive(null)} />
        </div>
      )}

      {/* ---- Contact Us bar ---- */}
      <a
        href={LINKTREE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group mt-6 flex items-center justify-center gap-3 rounded-xl border border-border bg-card px-5 py-4",
          "transition-colors hover:border-primary/40 hover:bg-accent/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
          <ExternalLink className="h-5 w-5" />
        </span>
        <span className="text-left">
          <span className="block text-sm font-semibold text-foreground">
            Contact Us
          </span>
          <span className="block text-xs text-muted-foreground">
            สอบถามเพิ่มเติมผ่าน Linktree
          </span>
        </span>
      </a>
    </div>
  );
}

function ActionView({
  def,
  onBack,
}: {
  def: ActionDef;
  onBack: () => void;
}) {
  const Icon = def.icon;
  return (
    <Card className="app-bg">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg ring-1",
              def.accent
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-lg">{def.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{def.titleTh}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Button>
      </CardHeader>
      <CardContent>
        {def.key === "borrow" ? <BorrowForm /> : <ReturnForm />}
      </CardContent>
    </Card>
  );
}
