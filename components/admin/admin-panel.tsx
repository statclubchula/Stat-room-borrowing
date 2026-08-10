"use client";

import * as React from "react";
import { Boxes, ClipboardList, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SuccessToast, type ToastData } from "@/components/ui/toast";
import { InventoryTable } from "@/components/admin/inventory-table";
import { BorrowLogsTable } from "@/components/admin/borrow-logs-table";
import { resetStore } from "@/lib/store";

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
  const [resetOpen, setResetOpen] = React.useState(false);
  const [toast, setToast] = React.useState<ToastData | null>(null);
  const active = TABS.find((t) => t.key === tab)!;

  function confirmReset() {
    resetStore();
    setResetOpen(false);
    setToast({
      title: "Data reset",
      description: "Inventory and history have been restored to the seed data.",
    });
  }

  return (
    <Card className="app-bg">
      <CardHeader className="gap-4 space-y-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

          {/* Restore the seed data (clears all local borrows/returns & edits). */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetOpen(true)}
            className="shrink-0 text-muted-foreground hover:text-red-500"
          >
            <RotateCcw className="h-4 w-4" />
            Reset data
          </Button>
        </div>
        <CardTitle className="sr-only">{active.label}</CardTitle>
      </CardHeader>
      <CardContent>
        {tab === "inventory" ? <InventoryTable /> : <BorrowLogsTable />}
      </CardContent>

      {/* Reset confirm */}
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset all data?"
        description="This action cannot be undone."
        className="max-w-md"
      >
        <p className="text-sm text-muted-foreground">
          This restores the original seed inventory and history, discarding{" "}
          <span className="font-medium text-foreground">
            every borrow, return, and edit
          </span>{" "}
          saved in this browser.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmReset}>
            <RotateCcw className="h-4 w-4" />
            Reset data
          </Button>
        </div>
      </Modal>

      <SuccessToast toast={toast} onClose={() => setToast(null)} />
    </Card>
  );
}
