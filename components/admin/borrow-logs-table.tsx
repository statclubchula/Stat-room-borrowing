"use client";

import * as React from "react";
import {
  CircleDot,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SuccessToast, type ToastData } from "@/components/ui/toast";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  resolveLogStatus,
  type BorrowLog,
  type BorrowStatus,
} from "@/lib/mock-data";
import { useLogs, updateLog, deleteLog, type LogDraft } from "@/lib/store";
import { todayISO } from "@/lib/borrow-utils";
import { toCsv, downloadCsv } from "@/lib/export-utils";
import { CATEGORY_STATUS_LABELS } from "@/lib/mock-data";
import { LogFormDialog } from "@/components/admin/log-form-dialog";

const STATUS_META: Record<
  BorrowStatus,
  { variant: "default" | "success" | "danger"; icon: React.ComponentType<{ className?: string }> }
> = {
  Borrowed: { variant: "default", icon: CircleDot },
  Returned: { variant: "success", icon: CheckCircle2 },
  Overdue: { variant: "danger", icon: AlertTriangle },
};

const FILTERS: Array<{ key: "all" | BorrowStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "Borrowed", label: "Borrowed" },
  { key: "Overdue", label: "Overdue" },
  { key: "Returned", label: "Returned" },
];

/** A clickable proof-photo thumbnail. */
function ProofThumb({
  src,
  caption,
  onView,
}: {
  src: string;
  caption: string;
  onView: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={onView}
        aria-label={`ดูรูปหลักฐานตอน${caption}`}
        title={`ดูรูปหลักฐานตอน${caption}`}
        className="h-9 w-9 shrink-0 overflow-hidden rounded border border-border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`หลักฐานตอน${caption}`} className="h-full w-full object-cover" />
      </button>
      <span className="text-[10px] text-muted-foreground">{caption}</span>
    </div>
  );
}

export function BorrowLogsTable() {
  const today = todayISO();
  const logs = useLogs();
  const [filter, setFilter] = React.useState<"all" | BorrowStatus>("all");
  const [editing, setEditing] = React.useState<BorrowLog | null>(null);
  const [deleting, setDeleting] = React.useState<BorrowLog | null>(null);
  const [viewing, setViewing] = React.useState<{ src: string; title: string } | null>(null);
  const [toast, setToast] = React.useState<ToastData | null>(null);

  // Resolve each log's effective status once (derives "Overdue").
  const rows = React.useMemo(
    () =>
      logs.map((log) => ({
        log,
        status: resolveLogStatus(log, today),
      })),
    [logs, today]
  );

  const counts = React.useMemo(() => {
    const c: Record<BorrowStatus, number> = {
      Borrowed: 0,
      Returned: 0,
      Overdue: 0,
    };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  function handleSave(draft: LogDraft) {
    if (!editing) return;
    updateLog(editing.id, draft);
    setToast({
      title: "Entry updated",
      description: `“${draft.borrowerName}” · ${draft.itemName} has been updated.`,
    });
    setEditing(null);
  }

  function confirmDelete() {
    if (!deleting) return;
    const { borrowerName, itemName } = deleting;
    deleteLog(deleting.id);
    setDeleting(null);
    setToast({
      title: "Entry deleted",
      description: `“${borrowerName}” · ${itemName} has been removed from the history.`,
    });
  }

  function handleExport() {
    const csv = toCsv(
      [
        "ID",
        "Borrower",
        "Year",
        "Major",
        "Contact",
        "Item Name",
        "Quantity",
        "Unit",
        "Borrow Date",
        "Due Date",
        "Returned On",
        "Status",
      ],
      // Export the current filter view; proof photos (data URLs) are omitted.
      filtered.map(({ log, status }) => [
        log.id,
        log.borrowerName,
        log.year,
        log.major,
        log.contact,
        log.itemName,
        log.quantity,
        log.unit,
        log.borrowDate,
        log.expectedReturnDate ?? "",
        log.actualReturnDate ?? "",
        CATEGORY_STATUS_LABELS[status],
      ])
    );
    downloadCsv(`borrow-history-${today}.csv`, csv);
  }

  return (
    <>
      {/* Filter chips + export */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const count =
              f.key === "all" ? rows.length : counts[f.key as BorrowStatus];
            return (
              <Button
                key={f.key}
                variant={filter === f.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="ml-1 opacity-70">({count})</span>
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="shrink-0"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Borrower</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Borrow Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Returned On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ClipboardList className="h-8 w-8" />
                    <span className="text-sm">No logs in this status</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(({ log, status }) => {
                const meta = STATUS_META[status];
                const Icon = meta.icon;
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {log.borrowerName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.year} · {log.major} · {log.contact}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {log.itemName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {log.quantity} {log.unit}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {log.borrowDate}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {log.expectedReturnDate ? (
                        <span
                          className={
                            status === "Overdue"
                              ? "font-medium text-red-500"
                              : "text-muted-foreground"
                          }
                        >
                          {log.expectedReturnDate}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {log.actualReturnDate ?? (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={meta.variant}>
                        <Icon className="h-3 w-3" />
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.proofPhoto || log.returnProofPhoto ? (
                        <div className="flex items-center gap-2">
                          {log.proofPhoto && (
                            <ProofThumb
                              src={log.proofPhoto}
                              caption="ยืม"
                              onView={() =>
                                setViewing({
                                  src: log.proofPhoto!,
                                  title: `หลักฐานตอนยืม · ${log.borrowerName} · ${log.itemName}`,
                                })
                              }
                            />
                          )}
                          {log.returnProofPhoto && (
                            <ProofThumb
                              src={log.returnProofPhoto}
                              caption="คืน"
                              onView={() =>
                                setViewing({
                                  src: log.returnProofPhoto!,
                                  title: `หลักฐานตอนคืน · ${log.borrowerName} · ${log.itemName}`,
                                })
                              }
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit entry for ${log.borrowerName}`}
                          onClick={() => setEditing(log)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete entry for ${log.borrowerName}`}
                          className="text-muted-foreground hover:text-red-500"
                          onClick={() => setDeleting(log)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <LogFormDialog
        open={editing !== null}
        log={editing}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />

      {/* Delete confirm */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Confirm Delete"
        description="This action cannot be undone."
        className="max-w-md"
      >
        <p className="text-sm text-muted-foreground">
          Delete the history entry for{" "}
          <span className="font-medium text-foreground">
            {deleting?.borrowerName}
          </span>{" "}
          ({deleting?.itemName})?
        </p>
        {deleting?.status === "Borrowed" && (
          <p className="mt-2 text-xs text-muted-foreground">
            This loan is still outstanding — {deleting.quantity} {deleting.unit}{" "}
            will be returned to the available stock.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </Modal>

      {/* Proof photo lightbox */}
      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? "หลักฐาน"}
        className="max-w-2xl"
      >
        {viewing && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={viewing.src}
            alt={viewing.title}
            className="mx-auto max-h-[65vh] w-auto rounded-md"
          />
        )}
      </Modal>

      <SuccessToast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
