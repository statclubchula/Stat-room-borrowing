"use client";

import * as React from "react";
import { Boxes, ClipboardList } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryTable } from "@/components/admin/inventory-table";
import { BorrowLogsTable } from "@/components/admin/borrow-logs-table";

type Tab = "inventory" | "logs";

const TABS: Array<{
  key: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "inventory", label: "Inventory", icon: Boxes },
  { key: "logs", label: "History", icon: ClipboardList },
];

export function AdminPanel() {
  const [tab, setTab] = React.useState<Tab>("inventory");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <Card className="app-bg">
      <CardHeader className="gap-4 space-y-0">
        {/* Tab switcher */}
        <div className="inline-flex w-full max-w-md rounded-lg border border-border bg-muted/40 p-1 sm:w-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={isActive}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none",
                  isActive
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
        <CardTitle className="sr-only">{active.label}</CardTitle>
      </CardHeader>
      <CardContent>
        {tab === "inventory" ? <InventoryTable /> : <BorrowLogsTable />}
      </CardContent>
    </Card>
  );
}
