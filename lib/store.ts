"use client";

/**
 * lib/store.ts
 *
 * A tiny dependency-free client store shared across the Borrow form, Return
 * form, and Admin panel. It holds the live inventory + borrow logs so that:
 *   - borrowing appends a log and DECREMENTS stock,
 *   - returning closes the loan and INCREMENTS stock,
 *   - admin add/edit/delete mutate the same source of truth.
 *
 * State lives at module scope, so it survives client-side navigation between
 * "/" and "/admin" (a full page reload resets it back to the seed data — fine
 * for a mock; swap this layer for Google Sheets / Supabase later).
 */

import { useSyncExternalStore } from "react";

import {
  inventory as seedInventory,
  borrowLogs as seedLogs,
  type InventoryItem,
  type BorrowLog,
  type BorrowStatus,
} from "@/lib/mock-data";
import { todayISO, type UserInfo } from "@/lib/borrow-utils";

/** Editable inventory fields (id + lastUpdated are managed by the store). */
export type ItemDraft = Omit<InventoryItem, "id" | "lastUpdated">;

interface StoreState {
  inventory: InventoryItem[];
  logs: BorrowLog[];
}

let state: StoreState = {
  inventory: seedInventory.map((i) => ({ ...i })),
  logs: seedLogs.map((l) => ({ ...l })),
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function setState(next: StoreState) {
  state = next;
  emit();
}

/* ------------------------------------------------------------------ */
/*  Hooks (read)                                                       */
/* ------------------------------------------------------------------ */

export function useInventory(): InventoryItem[] {
  return useSyncExternalStore(
    subscribe,
    () => state.inventory,
    () => state.inventory
  );
}

export function useLogs(): BorrowLog[] {
  return useSyncExternalStore(
    subscribe,
    () => state.logs,
    () => state.logs
  );
}

/* ------------------------------------------------------------------ */
/*  Id helpers                                                         */
/* ------------------------------------------------------------------ */

function nextId(items: { id: string }[], prefix: string): string {
  const max = items.reduce((acc, i) => {
    const n = Number(i.id.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Inventory actions (admin)                                          */
/* ------------------------------------------------------------------ */

export function addInventoryItem(draft: ItemDraft): InventoryItem {
  const item: InventoryItem = {
    id: nextId(state.inventory, "itm"),
    ...draft,
    lastUpdated: todayISO(),
  };
  setState({ ...state, inventory: [...state.inventory, item] });
  return item;
}

export function updateInventoryItem(id: string, draft: ItemDraft): void {
  setState({
    ...state,
    inventory: state.inventory.map((i) =>
      i.id === id ? { ...i, ...draft, lastUpdated: todayISO() } : i
    ),
  });
}

export function deleteInventoryItem(id: string): void {
  setState({
    ...state,
    inventory: state.inventory.filter((i) => i.id !== id),
  });
}

/* ------------------------------------------------------------------ */
/*  Borrow / return actions                                           */
/* ------------------------------------------------------------------ */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface BorrowInput {
  user: UserInfo;
  itemId: string;
  quantity: number;
  borrowDate: string;
  /** Only for Equipment (may be empty / undefined). */
  expectedReturnDate?: string;
}

/** Append a "Borrowed" log and decrement the item's available stock. */
export function borrowItem(input: BorrowInput): ActionResult {
  const item = state.inventory.find((i) => i.id === input.itemId);
  if (!item) return { ok: false, error: "ไม่พบรายการที่เลือก" };
  if (input.quantity < 1) return { ok: false, error: "จำนวนต้องมากกว่า 0" };
  if (input.quantity > item.availableQuantity) {
    return { ok: false, error: `คงเหลือเพียง ${item.availableQuantity} ${item.unit}` };
  }

  const log: BorrowLog = {
    id: nextId(state.logs, "log"),
    itemId: item.id,
    itemName: item.name,
    borrowerName: input.user.nickname,
    year: input.user.year,
    major: input.user.major,
    contact: input.user.contact,
    quantity: input.quantity,
    unit: item.unit,
    borrowDate: input.borrowDate,
    expectedReturnDate: input.expectedReturnDate || undefined,
    status: "Borrowed",
  };

  setState({
    inventory: state.inventory.map((i) =>
      i.id === item.id
        ? {
            ...i,
            availableQuantity: i.availableQuantity - input.quantity,
            lastUpdated: todayISO(),
          }
        : i
    ),
    logs: [log, ...state.logs],
  });

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Borrow-log actions (admin corrections)                            */
/* ------------------------------------------------------------------ */

/**
 * Editable fields of a borrow log. `id`, `itemId`, and `unit` are kept as
 * stored (the log links back to its inventory item) — admins fix data
 * mistakes here, they don't re-point a log at a different item.
 */
export type LogDraft = {
  itemName: string;
  borrowerName: string;
  year: string;
  major: string;
  contact: string;
  quantity: number;
  borrowDate: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  /** Stored status ("Borrowed" or "Returned" — "Overdue" is derived). */
  status: Exclude<BorrowStatus, "Overdue">;
};

/** Stock currently withheld by a log: its quantity while outstanding, else 0. */
function outstandingQty(log: { status: string; quantity: number }): number {
  return log.status === "Borrowed" ? log.quantity : 0;
}

/**
 * Edit a log in place, reconciling the linked item's available stock for any
 * change in outstanding quantity (e.g. flipping Borrowed→Returned frees stock).
 */
export function updateLog(id: string, draft: LogDraft): void {
  const existing = state.logs.find((l) => l.id === id);
  if (!existing) return;

  const oldEffect = outstandingQty(existing);
  const newEffect = outstandingQty(draft);
  const delta = oldEffect - newEffect; // > 0 gives stock back

  setState({
    inventory:
      delta === 0
        ? state.inventory
        : state.inventory.map((i) =>
            i.id === existing.itemId
              ? {
                  ...i,
                  availableQuantity: Math.max(
                    0,
                    Math.min(i.totalQuantity, i.availableQuantity + delta)
                  ),
                  lastUpdated: todayISO(),
                }
              : i
          ),
    logs: state.logs.map((l) =>
      l.id === id
        ? {
            ...l,
            itemName: draft.itemName,
            borrowerName: draft.borrowerName,
            year: draft.year,
            major: draft.major,
            contact: draft.contact,
            quantity: draft.quantity,
            borrowDate: draft.borrowDate,
            expectedReturnDate: draft.expectedReturnDate || undefined,
            status: draft.status,
            // Only a returned loan keeps a return date.
            actualReturnDate:
              draft.status === "Returned"
                ? draft.actualReturnDate || undefined
                : undefined,
          }
        : l
    ),
  });
}

/**
 * Delete a log. If it was still outstanding, its quantity is returned to the
 * linked item's available stock (the loan is being undone).
 */
export function deleteLog(id: string): void {
  const existing = state.logs.find((l) => l.id === id);
  if (!existing) return;

  const restore = outstandingQty(existing);

  setState({
    inventory:
      restore === 0
        ? state.inventory
        : state.inventory.map((i) =>
            i.id === existing.itemId
              ? {
                  ...i,
                  availableQuantity: Math.min(
                    i.totalQuantity,
                    i.availableQuantity + restore
                  ),
                  lastUpdated: todayISO(),
                }
              : i
          ),
    logs: state.logs.filter((l) => l.id !== id),
  });
}

export interface ReturnInput {
  /** The outstanding loan (log) being returned. */
  logId: string;
  actualReturnDate: string;
}

/** Close an outstanding loan and increment the item's available stock. */
export function returnLoan(input: ReturnInput): ActionResult {
  const log = state.logs.find((l) => l.id === input.logId);
  if (!log) return { ok: false, error: "ไม่พบรายการยืม" };
  if (log.status === "Returned") {
    return { ok: false, error: "รายการนี้ถูกคืนไปแล้ว" };
  }

  setState({
    inventory: state.inventory.map((i) =>
      i.id === log.itemId
        ? {
            ...i,
            // Never exceed the total on hand.
            availableQuantity: Math.min(
              i.totalQuantity,
              i.availableQuantity + log.quantity
            ),
            lastUpdated: todayISO(),
          }
        : i
    ),
    logs: state.logs.map((l) =>
      l.id === input.logId
        ? { ...l, status: "Returned", actualReturnDate: input.actualReturnDate }
        : l
    ),
  });

  return { ok: true };
}
