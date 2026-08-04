"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { FieldError } from "@/components/ui/field-error";
import {
  type InventoryItem,
  type ItemCategory,
} from "@/lib/mock-data";

/** The editable fields of an inventory item (id + lastUpdated are managed by the parent). */
export type ItemDraft = Omit<InventoryItem, "id" | "lastUpdated">;

const CATEGORIES: ItemCategory[] = ["Equipment", "Non-circulating"];

const EMPTY_DRAFT: ItemDraft = {
  name: "",
  category: "Equipment",
  totalQuantity: 1,
  availableQuantity: 1,
  unit: "",
  location: "",
  photoUrl: "",
};

interface ItemFormDialogProps {
  open: boolean;
  /** The item being edited, or null when adding a new one. */
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (draft: ItemDraft) => void;
}

export function ItemFormDialog({
  open,
  item,
  onClose,
  onSave,
}: ItemFormDialogProps) {
  const [draft, setDraft] = React.useState<ItemDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const isEdit = item !== null;

  // Re-seed the form whenever the dialog opens (for a new item or an edit).
  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setSaving(false);
    if (item) {
      const { id: _id, lastUpdated: _lu, ...rest } = item;
      setDraft(rest);
    } else {
      setDraft(EMPTY_DRAFT);
    }
  }, [open, item]);

  function set<K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!draft.name.trim()) errs.name = "Please enter an item name";
    if (!draft.unit.trim()) errs.unit = "Please enter a unit";
    if (!draft.location.trim()) errs.location = "Please enter a location";

    if (!Number.isFinite(draft.totalQuantity) || draft.totalQuantity < 0) {
      errs.totalQuantity = "Total quantity cannot be negative";
    }
    if (!Number.isFinite(draft.availableQuantity) || draft.availableQuantity < 0) {
      errs.availableQuantity = "Available quantity cannot be negative";
    } else if (draft.availableQuantity > draft.totalQuantity) {
      errs.availableQuantity = "Available cannot exceed total quantity";
    }
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    // Simulate an async persist (Google Sheets / Supabase later).
    setTimeout(() => {
      onSave({
        ...draft,
        name: draft.name.trim(),
        unit: draft.unit.trim(),
        location: draft.location.trim(),
      });
    }, 400);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Item" : "Add Item"}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="item-name">
            Item Name <span className="text-primary">*</span>
          </Label>
          <Input
            id="item-name"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={!!errors.name}
          />
          <FieldError message={errors.name} />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label htmlFor="item-category">
            Category <span className="text-primary">*</span>
          </Label>
          <Select
            id="item-category"
            value={draft.category}
            onChange={(e) => set("category", e.target.value as ItemCategory)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
        </div>

        {/* Quantities */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="item-total">
              Total Quantity <span className="text-primary">*</span>
            </Label>
            <Input
              id="item-total"
              type="number"
              min={0}
              value={draft.totalQuantity}
              onChange={(e) => set("totalQuantity", Number(e.target.value))}
              aria-invalid={!!errors.totalQuantity}
            />
            <FieldError message={errors.totalQuantity} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-available">
              Available <span className="text-primary">*</span>
            </Label>
            <Input
              id="item-available"
              type="number"
              min={0}
              value={draft.availableQuantity}
              onChange={(e) =>
                set("availableQuantity", Number(e.target.value))
              }
              aria-invalid={!!errors.availableQuantity}
            />
            <FieldError message={errors.availableQuantity} />
          </div>
        </div>

        {/* Unit + location */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="item-unit">
              Unit <span className="text-primary">*</span>
            </Label>
            <Input
              id="item-unit"
              value={draft.unit}
              onChange={(e) => set("unit", e.target.value)}
              aria-invalid={!!errors.unit}
            />
            <FieldError message={errors.unit} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-location">
              Location <span className="text-primary">*</span>
            </Label>
            <Input
              id="item-location"
              value={draft.location}
              onChange={(e) => set("location", e.target.value)}
              aria-invalid={!!errors.location}
            />
            <FieldError message={errors.location} />
          </div>
        </div>

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
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Item"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
