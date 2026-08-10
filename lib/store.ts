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
 * State lives at module scope AND is persisted to localStorage, so it survives
 * both client-side navigation and a full page reload — and syncs across tabs.
 * This matters because "/admin" is reached by a full page load (there is no
 * client-side link to it), which used to reset everything back to seed data and
 * hide any borrow/return made on the home page. (Swap this layer for Google
 * Sheets / Supabase later; clearing the STORAGE_KEY below restores the seed.)
 */

import { useSyncExternalStore } from "react";

import {
  inventory as seedInventory,
  borrowLogs as seedLogs,
  categoryNeedsReturnDate,
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

/** localStorage slot. Bump the version suffix to invalidate an old schema. */
const STORAGE_KEY = "stat-room-store-v1";

/** A fresh copy of the seed data (defensive clone so callers can't mutate it). */
function seedState(): StoreState {
  return {
    inventory: seedInventory.map((i) => ({ ...i })),
    logs: seedLogs.map((l) => ({ ...l })),
  };
}

function isStoreState(value: unknown): value is StoreState {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as StoreState).inventory) &&
    Array.isArray((value as StoreState).logs)
  );
}

/** Stable snapshot returned during SSR/hydration (matches the server markup). */
const serverState: StoreState = seedState();

/** Read persisted state on the client; fall back to seed on server or if empty. */
function loadInitialState(): StoreState {
  if (typeof window === "undefined") return seedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isStoreState(parsed)) return parsed;
    }
  } catch {
    // Corrupt/blocked storage — fall back to seed.
  }
  return seedState();
}

let state: StoreState = loadInitialState();

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

/**
 * Write the current state to localStorage. Returns whether the write succeeded
 * so callers can warn the user when it didn't (e.g. quota exceeded because a
 * large proof photo filled the ~5MB budget) instead of losing data silently.
 */
function persist(): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    // Storage full or unavailable — keep the in-memory state, report the miss.
    return false;
  }
}

/** Apply new state, persist it, and notify subscribers. Returns persist success. */
function setState(next: StoreState): boolean {
  state = next;
  const saved = persist();
  emit();
  return saved;
}

/** Shown when a change applied in memory but couldn't be saved to localStorage. */
const PERSIST_WARNING =
  "บันทึกลงเครื่องไม่สำเร็จ — พื้นที่จัดเก็บของเบราว์เซอร์อาจเต็ม ข้อมูลนี้อาจหายเมื่อรีเฟรชหน้า";

// Keep other tabs/windows (e.g. the home page and /admin open side by side) in
// sync: a `storage` event fires in every OTHER document when localStorage
// changes, so we adopt the new state and re-render.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || e.newValue == null) return;
    try {
      const parsed: unknown = JSON.parse(e.newValue);
      if (isStoreState(parsed)) {
        state = parsed;
        emit();
      }
    } catch {
      // Ignore malformed cross-tab payloads.
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Hooks (read)                                                       */
/* ------------------------------------------------------------------ */

export function useInventory(): InventoryItem[] {
  return useSyncExternalStore(
    subscribe,
    () => state.inventory,
    () => serverState.inventory
  );
}

export function useLogs(): BorrowLog[] {
  return useSyncExternalStore(
    subscribe,
    () => state.logs,
    () => serverState.logs
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

/**
 * Discard every borrow/return and inventory edit, restoring the seed data. Used
 * by the admin "reset data" control; also overwrites the persisted copy so the
 * seed sticks across reloads and syncs to other open tabs.
 */
export function resetStore(): void {
  setState(seedState());
}

/* ------------------------------------------------------------------ */
/*  Borrow / return actions                                           */
/* ------------------------------------------------------------------ */

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Set when the change applied in memory but couldn't be persisted (see PERSIST_WARNING). */
  warning?: string;
}

export interface BorrowInput {
  user: UserInfo;
  itemId: string;
  quantity: number;
  borrowDate: string;
  /** Only for returnable items (อุปกรณ์ / วัสดุหมุนเวียน); may be empty / undefined. */
  expectedReturnDate?: string;
  /** Optional borrow-time proof photo (data URL). */
  proofPhoto?: string;
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
    proofPhoto: input.proofPhoto || undefined,
    status: "Borrowed",
  };

  const saved = setState({
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

  return saved ? { ok: true } : { ok: true, warning: PERSIST_WARNING };
}

/** One line of a multi-item borrow (an item + how many of it). */
export interface BorrowLineInput {
  itemId: string;
  quantity: number;
}

export interface BorrowManyInput {
  user: UserInfo;
  borrowDate: string;
  /**
   * Shared expected return date. Applied only to returnable items
   * (อุปกรณ์ / วัสดุหมุนเวียน) in the batch; consumed items ignore it.
   */
  expectedReturnDate?: string;
  /** Optional borrow-time proof photo (data URL), shared across the batch. */
  proofPhoto?: string;
  lines: BorrowLineInput[];
}

/**
 * Append one "Borrowed" log per line and decrement each item's stock. Validates
 * the whole batch first — including aggregated demand when the same item appears
 * on more than one line — so it either commits everything or nothing.
 */
export function borrowItems(input: BorrowManyInput): ActionResult {
  if (input.lines.length === 0) {
    return { ok: false, error: "ยังไม่ได้เลือกรายการที่จะยืม" };
  }

  // Aggregate how many of each item are requested across all lines.
  const demand = new Map<string, number>();
  for (const line of input.lines) {
    if (line.quantity < 1) return { ok: false, error: "จำนวนต้องมากกว่า 0" };
    demand.set(line.itemId, (demand.get(line.itemId) ?? 0) + line.quantity);
  }

  // Every item must exist and have enough stock for its total demand.
  let stockError = "";
  demand.forEach((qty, itemId) => {
    if (stockError) return;
    const item = state.inventory.find((i) => i.id === itemId);
    if (!item) {
      stockError = "ไม่พบรายการที่เลือก";
    } else if (qty > item.availableQuantity) {
      stockError = `${item.name}: คงเหลือเพียง ${item.availableQuantity} ${item.unit}`;
    }
  });
  if (stockError) return { ok: false, error: stockError };

  // Build the logs, assigning fresh ids that account for ones added this batch.
  const newLogs: BorrowLog[] = [];
  for (const line of input.lines) {
    const item = state.inventory.find((i) => i.id === line.itemId)!;
    newLogs.push({
      id: nextId([...state.logs, ...newLogs], "log"),
      itemId: item.id,
      itemName: item.name,
      borrowerName: input.user.nickname,
      year: input.user.year,
      major: input.user.major,
      contact: input.user.contact,
      quantity: line.quantity,
      unit: item.unit,
      borrowDate: input.borrowDate,
      expectedReturnDate:
        input.expectedReturnDate && categoryNeedsReturnDate(item.category)
          ? input.expectedReturnDate
          : undefined,
      proofPhoto: input.proofPhoto || undefined,
      status: "Borrowed",
    });
  }

  const saved = setState({
    inventory: state.inventory.map((i) => {
      const dec = demand.get(i.id) ?? 0;
      return dec
        ? { ...i, availableQuantity: i.availableQuantity - dec, lastUpdated: todayISO() }
        : i;
    }),
    logs: [...newLogs, ...state.logs],
  });

  return saved ? { ok: true } : { ok: true, warning: PERSIST_WARNING };
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
  /** Optional return-time condition photo (data URL). */
  proofPhoto?: string;
}

/** Close an outstanding loan and increment the item's available stock. */
export function returnLoan(input: ReturnInput): ActionResult {
  const log = state.logs.find((l) => l.id === input.logId);
  if (!log) return { ok: false, error: "ไม่พบรายการยืม" };
  if (log.status === "Returned") {
    return { ok: false, error: "รายการนี้ถูกคืนไปแล้ว" };
  }

  const saved = setState({
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
        ? {
            ...l,
            status: "Returned",
            actualReturnDate: input.actualReturnDate,
            returnProofPhoto: input.proofPhoto || l.returnProofPhoto,
          }
        : l
    ),
  });

  return saved ? { ok: true } : { ok: true, warning: PERSIST_WARNING };
}

export interface ReturnManyInput {
  /** The outstanding loans (logs) being returned together. */
  logIds: string[];
  actualReturnDate: string;
  /** Optional return-time condition photo (data URL), shared across the batch. */
  proofPhoto?: string;
}

/**
 * Close several outstanding loans at once, incrementing each linked item's
 * available stock. Validates the whole batch first (every loan must exist, be
 * outstanding, and appear only once) so it either commits all or nothing.
 */
export function returnLoans(input: ReturnManyInput): ActionResult {
  if (input.logIds.length === 0) {
    return { ok: false, error: "ยังไม่ได้เลือกรายการที่จะคืน" };
  }

  // Reject duplicate selections up front.
  const unique = new Set(input.logIds);
  if (unique.size !== input.logIds.length) {
    return { ok: false, error: "มีรายการซ้ำกัน กรุณาตรวจสอบ" };
  }

  // Every selected loan must exist and still be outstanding.
  let err = "";
  unique.forEach((id) => {
    if (err) return;
    const log = state.logs.find((l) => l.id === id);
    if (!log) err = "ไม่พบรายการยืม";
    else if (log.status === "Returned") err = "มีรายการที่ถูกคืนไปแล้ว";
  });
  if (err) return { ok: false, error: err };

  // How much stock each item gets back across the batch.
  const restore = new Map<string, number>();
  unique.forEach((id) => {
    const log = state.logs.find((l) => l.id === id)!;
    restore.set(log.itemId, (restore.get(log.itemId) ?? 0) + log.quantity);
  });

  const saved = setState({
    inventory: state.inventory.map((i) => {
      const add = restore.get(i.id) ?? 0;
      return add
        ? {
            ...i,
            availableQuantity: Math.min(i.totalQuantity, i.availableQuantity + add),
            lastUpdated: todayISO(),
          }
        : i;
    }),
    logs: state.logs.map((l) =>
      unique.has(l.id)
        ? {
            ...l,
            status: "Returned",
            actualReturnDate: input.actualReturnDate,
            returnProofPhoto: input.proofPhoto || l.returnProofPhoto,
          }
        : l
    ),
  });

  return saved ? { ok: true } : { ok: true, warning: PERSIST_WARNING };
}
