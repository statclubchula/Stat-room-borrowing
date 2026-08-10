"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Search, PackageX, Download } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  CATEGORY_LABELS,
  CATEGORY_TEXT_COLORS,
  getStockStatus,
  type InventoryItem,
  type StockStatus,
} from "@/lib/mock-data";
import {
  useInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "@/lib/store";
import { ItemFormDialog, type ItemDraft } from "@/components/admin/item-form-dialog";
import { toCsv, downloadCsv } from "@/lib/export-utils";
import { todayISO } from "@/lib/borrow-utils";

const STATUS_VARIANT: Record<
  StockStatus,
  "success" | "warning" | "danger"
> = {
  "in-stock": "success",
  "low-stock": "warning",
  "out-of-stock": "danger",
};

export function InventoryTable() {
  const items = useInventory();
  const [query, setQuery] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = React.useState<InventoryItem | null>(null);
  const [toast, setToast] = React.useState<ToastData | null>(null);

  const counts = React.useMemo(() => {
    const c = { total: items.length, "in-stock": 0, "low-stock": 0, "out-of-stock": 0 };
    for (const item of items) c[getStockStatus(item).status] += 1;
    return c;
  }, [items]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        CATEGORY_LABELS[i.category].toLowerCase().includes(q)
    );
  }, [items, query]);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setDialogOpen(true);
  }

  function handleSave(draft: ItemDraft) {
    if (editing) {
      updateInventoryItem(editing.id, draft);
      setToast({
        title: "Item updated",
        description: `“${draft.name}” has been updated.`,
      });
    } else {
      addInventoryItem(draft);
      setToast({
        title: "Item added",
        description: `“${draft.name}” has been added to the inventory.`,
      });
    }
    setDialogOpen(false);
    setEditing(null);
  }

  function confirmDelete() {
    if (!deleting) return;
    const name = deleting.name;
    deleteInventoryItem(deleting.id);
    setDeleting(null);
    setToast({
      title: "Item deleted",
      description: `“${name}” has been removed from the inventory.`,
    });
  }

  function handleExport() {
    const csv = toCsv(
      [
        "ID",
        "Item Name",
        "Category",
        "Available",
        "Total",
        "Unit",
        "Location",
        "Last Updated",
      ],
      // Export the current search result, so a filtered view exports as shown.
      filtered.map((i) => [
        i.id,
        i.name,
        CATEGORY_LABELS[i.category],
        i.availableQuantity,
        i.totalQuantity,
        i.unit,
        i.location,
        i.lastUpdated,
      ])
    );
    downloadCsv(`inventory-${todayISO()}.csv`, csv);
  }

  return (
    <>
      {/* Summary + actions */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline">Total {counts.total}</Badge>
          <Badge variant="success">In Stock {counts["in-stock"]}</Badge>
          <Badge variant="warning">Low Stock {counts["low-stock"]}</Badge>
          <Badge variant="danger">Out of Stock {counts["out-of-stock"]}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-40 pl-9 sm:w-52"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="shrink-0"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={openAdd} className="shrink-0">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Available / Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <PackageX className="h-8 w-8" />
                    <span className="text-sm">
                      {query ? "No items match your search" : "No items in inventory yet"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const meta = getStockStatus(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">
                      {item.name}
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-sm", CATEGORY_TEXT_COLORS[item.category])}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="font-medium text-foreground">
                        {item.availableQuantity}
                      </span>
                      <span className="text-muted-foreground">
                        {" / "}
                        {item.totalQuantity} {item.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[meta.status]}>
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.location}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {item.lastUpdated}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${item.name}`}
                          className="text-muted-foreground hover:text-red-500"
                          onClick={() => setDeleting(item)}
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

      {/* Add / Edit dialog */}
      <ItemFormDialog
        open={dialogOpen}
        item={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
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
          Delete{" "}
          <span className="font-medium text-foreground">
            {deleting?.name}
          </span>{" "}
          from the inventory?
        </p>
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

      <SuccessToast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
