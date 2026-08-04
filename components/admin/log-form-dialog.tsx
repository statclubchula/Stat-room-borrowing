"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { FieldError } from "@/components/ui/field-error";
import { type BorrowLog } from "@/lib/mock-data";
import { type LogDraft } from "@/lib/store";

const STATUSES: Array<Exclude<BorrowLog["status"], never>> = [
  "Borrowed",
  "Returned",
];

const EMPTY_DRAFT: LogDraft = {
  itemName: "",
  borrowerName: "",
  year: "",
  major: "",
  contact: "",
  quantity: 1,
  borrowDate: "",
  expectedReturnDate: "",
  actualReturnDate: "",
  status: "Borrowed",
};

interface LogFormDialogProps {
  open: boolean;
  /** The log being edited (history entries are only ever edited, never added here). */
  log: BorrowLog | null;
  onClose: () => void;
  onSave: (draft: LogDraft) => void;
}

export function LogFormDialog({ open, log, onClose, onSave }: LogFormDialogProps) {
  const [draft, setDraft] = React.useState<LogDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  // Re-seed the form each time the dialog opens on a log.
  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setSaving(false);
    if (log) {
      setDraft({
        itemName: log.itemName,
        borrowerName: log.borrowerName,
        year: log.year,
        major: log.major,
        contact: log.contact,
        quantity: log.quantity,
        borrowDate: log.borrowDate,
        expectedReturnDate: log.expectedReturnDate ?? "",
        actualReturnDate: log.actualReturnDate ?? "",
        status: log.status,
      });
    } else {
      setDraft(EMPTY_DRAFT);
    }
  }, [open, log]);

  function set<K extends keyof LogDraft>(key: K, value: LogDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!draft.borrowerName.trim()) errs.borrowerName = "Please enter a borrower name";
    if (!draft.itemName.trim()) errs.itemName = "Please enter an item name";
    if (!draft.borrowDate) errs.borrowDate = "Please select a borrow date";

    if (!Number.isFinite(draft.quantity) || draft.quantity < 1) {
      errs.quantity = "Quantity must be at least 1";
    }
    if (
      draft.expectedReturnDate &&
      draft.expectedReturnDate < draft.borrowDate
    ) {
      errs.expectedReturnDate = "Due date cannot be before the borrow date";
    }
    if (
      draft.status === "Returned" &&
      draft.actualReturnDate &&
      draft.actualReturnDate < draft.borrowDate
    ) {
      errs.actualReturnDate = "Return date cannot be before the borrow date";
    }
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setTimeout(() => {
      onSave({
        ...draft,
        itemName: draft.itemName.trim(),
        borrowerName: draft.borrowerName.trim(),
        year: draft.year.trim(),
        major: draft.major.trim(),
        contact: draft.contact.trim(),
      });
    }, 400);
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit History Entry">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Borrower + item */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="log-borrower">
              Borrower <span className="text-primary">*</span>
            </Label>
            <Input
              id="log-borrower"
              value={draft.borrowerName}
              onChange={(e) => set("borrowerName", e.target.value)}
              aria-invalid={!!errors.borrowerName}
            />
            <FieldError message={errors.borrowerName} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-item">
              Item Name <span className="text-primary">*</span>
            </Label>
            <Input
              id="log-item"
              value={draft.itemName}
              onChange={(e) => set("itemName", e.target.value)}
              aria-invalid={!!errors.itemName}
            />
            <FieldError message={errors.itemName} />
          </div>
        </div>

        {/* Year / major / contact */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="log-year">Year</Label>
            <Input
              id="log-year"
              value={draft.year}
              onChange={(e) => set("year", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-major">Major</Label>
            <Input
              id="log-major"
              value={draft.major}
              onChange={(e) => set("major", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-contact">Contact</Label>
            <Input
              id="log-contact"
              value={draft.contact}
              onChange={(e) => set("contact", e.target.value)}
            />
          </div>
        </div>

        {/* Quantity + status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="log-quantity">
              Quantity <span className="text-primary">*</span>
            </Label>
            <Input
              id="log-quantity"
              type="number"
              min={1}
              value={draft.quantity}
              onChange={(e) => set("quantity", Number(e.target.value))}
              aria-invalid={!!errors.quantity}
            />
            <FieldError message={errors.quantity} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-status">Status</Label>
            <Select
              id="log-status"
              value={draft.status}
              onChange={(e) =>
                set("status", e.target.value as LogDraft["status"])
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="log-borrow-date">
              Borrow Date <span className="text-primary">*</span>
            </Label>
            <Input
              id="log-borrow-date"
              type="date"
              value={draft.borrowDate}
              onChange={(e) => set("borrowDate", e.target.value)}
              aria-invalid={!!errors.borrowDate}
            />
            <FieldError message={errors.borrowDate} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-due-date">Due Date</Label>
            <Input
              id="log-due-date"
              type="date"
              value={draft.expectedReturnDate ?? ""}
              onChange={(e) => set("expectedReturnDate", e.target.value)}
              aria-invalid={!!errors.expectedReturnDate}
            />
            <FieldError message={errors.expectedReturnDate} />
          </div>
        </div>

        {/* Returned-on — only meaningful once returned */}
        {draft.status === "Returned" && (
          <div className="space-y-1.5">
            <Label htmlFor="log-returned-date">Returned On</Label>
            <Input
              id="log-returned-date"
              type="date"
              value={draft.actualReturnDate ?? ""}
              onChange={(e) => set("actualReturnDate", e.target.value)}
              aria-invalid={!!errors.actualReturnDate}
            />
            <FieldError message={errors.actualReturnDate} />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="min-w-28">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
