"use client";

/**
 * lib/store.ts
 *
 * The shared client store behind the Borrow form, Return form, and Admin panel.
 * It holds the live inventory + borrow logs so that:
 *   - borrowing appends a log and DECREMENTS stock,
 *   - returning closes the loan and INCREMENTS stock,
 *   - admin add/edit/delete mutate the same source of truth.
 *
 * Backend: Supabase (Postgres + Realtime). The store keeps an in-memory cache
 * for instant, synchronous reads/writes (the UI calls stay synchronous), then:
 *   1. applies each change OPTIMISTICALLY to the cache and re-renders,
 *   2. pushes the change to Supabase in the background,
 *   3. re-fetches on any Realtime event so every device — the person on their
 *      own phone, the admin laptop — converges on the same authoritative data.
 *
 * If Supabase isn't configured (no `.env.local`), the client is null and the
 * app degrades to in-memory seed data (no persistence, no sync) so it still runs.
 */

import { useSyncExternalStore } from "react";

import {
  inventory as seedInventory,
  categoryNeedsReturnDate,
  type InventoryItem,
  type BorrowLog,
  type BorrowStatus,
} from "@/lib/mock-data";
import { todayISO, type UserInfo } from "@/lib/borrow-utils";
import {
  supabase,
  itemFromRow,
  logFromRow,
  rowFromItem,
  rowFromLog,
  type InventoryRow,
  type BorrowLogRow,
} from "@/lib/supabase";

/** Editable inventory fields (id + lastUpdated are managed by the store). */
export type ItemDraft = Omit<InventoryItem, "id" | "lastUpdated">;

interface StoreState {
  inventory: InventoryItem[];
  logs: BorrowLog[];
}

/** A fresh copy of the seed inventory (defensive clone so callers can't mutate it). */
function seedState(): StoreState {
  return {
    inventory: seedInventory.map((i) => ({ ...i })),
    logs: [],
  };
}

/**
 * Stable snapshot for SSR *and* the client's first paint. Both start from the
 * same seed so hydration markup matches; the client then swaps in live Supabase
 * data via `refetchAll()` right after mount.
 */
const serverState: StoreState = seedState();

let state: StoreState = seedState();

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

/** Apply new in-memory state and notify subscribers. */
function setState(next: StoreState): void {
  state = next;
  emit();
}

/* ------------------------------------------------------------------ */
/*  Supabase sync                                                      */
/* ------------------------------------------------------------------ */

/**
 * Fire a background write to Supabase. Errors don't block the (already-applied)
 * optimistic update; instead we log them and re-fetch so the cache falls back
 * to the server's truth. A Realtime event from our own successful write also
 * triggers a re-fetch, which reconciles anything the optimistic math got wrong.
 */
function queue(
  op: () => PromiseLike<{ error: unknown | null }>,
  label: string
): void {
  if (!supabase) return;
  Promise.resolve()
    .then(op)
    .then((res) => {
      if (res?.error) {
        console.error(`[store] ${label} failed:`, res.error);
        void refetchAll();
      }
    })
    .catch((err) => {
      console.error(`[store] ${label} threw:`, err);
      void refetchAll();
    });
}

function pushItemUpserts(items: InventoryItem[]): void {
  if (!supabase || items.length === 0) return;
  queue(
    () => supabase!.from("inventory").upsert(items.map(rowFromItem)),
    "inventory upsert"
  );
}

function pushItemDelete(id: string): void {
  if (!supabase) return;
  queue(() => supabase!.from("inventory").delete().eq("id", id), "inventory delete");
}

function pushLogInserts(logs: BorrowLog[]): void {
  if (!supabase || logs.length === 0) return;
  queue(
    () => supabase!.from("borrow_logs").insert(logs.map(rowFromLog)),
    "borrow_logs insert"
  );
}

function pushLogUpserts(logs: BorrowLog[]): void {
  if (!supabase || logs.length === 0) return;
  queue(
    () => supabase!.from("borrow_logs").upsert(logs.map(rowFromLog)),
    "borrow_logs upsert"
  );
}

function pushLogDelete(id: string): void {
  if (!supabase) return;
  queue(() => supabase!.from("borrow_logs").delete().eq("id", id), "borrow_logs delete");
}

/** Pull the authoritative inventory + logs from Supabase into the cache. */
async function refetchAll(): Promise<void> {
  if (!supabase) return;
  const [invRes, logRes] = await Promise.all([
    supabase.from("inventory").select("*").order("id", { ascending: true }),
    supabase
      .from("borrow_logs")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  if (invRes.error) {
    console.error("[store] fetch inventory failed:", invRes.error);
    return;
  }
  if (logRes.error) {
    console.error("[store] fetch borrow_logs failed:", logRes.error);
    return;
  }
  setState({
    inventory: (invRes.data as InventoryRow[]).map(itemFromRow),
    logs: (logRes.data as BorrowLogRow[]).map(logFromRow),
  });
}

// On the client, hydrate from Supabase once and keep in sync via Realtime.
// Every insert/update/delete on either table re-pulls the authoritative state,
// so a borrow made on someone's phone shows up on the admin screen live.
if (typeof window !== "undefined" && supabase) {
  void refetchAll();
  supabase
    .channel("stat-room-store")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "inventory" },
      () => void refetchAll()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "borrow_logs" },
      () => void refetchAll()
    )
    .subscribe();
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

/** Next `itm-NNN` id for a new inventory item (borrow logs use UUIDs). */
function nextItemId(items: { id: string }[]): string {
  const max = items.reduce((acc, i) => {
    const n = Number(i.id.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `itm-${String(max + 1).padStart(3, "0")}`;
}

/** Fresh UUID for a borrow log — matches the DB's `gen_random_uuid()` PK. */
function newLogId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Extremely old browser fallback (should never run in practice).
  return `log-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

/* ------------------------------------------------------------------ */
/*  Inventory actions (admin)                                          */
/* ------------------------------------------------------------------ */

export function addInventoryItem(draft: ItemDraft): InventoryItem {
  const item: InventoryItem = {
    id: nextItemId(state.inventory),
    ...draft,
    lastUpdated: todayISO(),
  };
  setState({ ...state, inventory: [...state.inventory, item] });
  pushItemUpserts([item]);
  return item;
}

export function updateInventoryItem(id: string, draft: ItemDraft): void {
  let updated: InventoryItem | undefined;
  const inventory = state.inventory.map((i) => {
    if (i.id !== id) return i;
    updated = { ...i, ...draft, lastUpdated: todayISO() };
    return updated;
  });
  setState({ ...state, inventory });
  if (updated) pushItemUpserts([updated]);
}

export function deleteInventoryItem(id: string): void {
  setState({
    ...state,
    inventory: state.inventory.filter((i) => i.id !== id),
  });
  pushItemDelete(id);
}

/**
 * Discard every borrow/return and restore the seed inventory (admin "reset
 * data"). With Supabase this clears ALL borrow logs and rewrites inventory to
 * the seed snapshot for everyone — it's a deliberate, destructive baseline.
 */
export function resetStore(): void {
  const seed = seedState();
  setState(seed);
  if (supabase) {
    // Delete every log (PostgREST needs a filter; this one matches all rows).
    queue(
      () =>
        supabase!
          .from("borrow_logs")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000"),
      "reset: clear logs"
    );
    pushItemUpserts(seed.inventory);
  }
}

/* ------------------------------------------------------------------ */
/*  Borrow / return actions                                           */
/* ------------------------------------------------------------------ */

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Reserved for non-fatal warnings surfaced to the user (unused with Supabase). */
  warning?: string;
}

export interface BorrowInput {
  user: UserInfo;
  itemId: string;
  quantity: number;
  borrowDate: string;
  /** Only for returnable items (อุปกรณ์ / วัสดุหมุนเวียน); may be empty / undefined. */
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
    id: newLogId(),
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

  const updatedItem: InventoryItem = {
    ...item,
    availableQuantity: item.availableQuantity - input.quantity,
    lastUpdated: todayISO(),
  };

  setState({
    inventory: state.inventory.map((i) => (i.id === item.id ? updatedItem : i)),
    logs: [log, ...state.logs],
  });

  pushLogInserts([log]);
  pushItemUpserts([updatedItem]);
  return { ok: true };
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

  // Build the logs (one per line) with fresh UUID ids.
  const newLogs: BorrowLog[] = [];
  for (const line of input.lines) {
    const item = state.inventory.find((i) => i.id === line.itemId)!;
    newLogs.push({
      id: newLogId(),
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
      status: "Borrowed",
    });
  }

  const nextInventory = state.inventory.map((i) => {
    const dec = demand.get(i.id) ?? 0;
    return dec
      ? { ...i, availableQuantity: i.availableQuantity - dec, lastUpdated: todayISO() }
      : i;
  });
  const changedItems = nextInventory.filter((i) => demand.has(i.id));

  setState({ inventory: nextInventory, logs: [...newLogs, ...state.logs] });

  pushLogInserts(newLogs);
  pushItemUpserts(changedItems);
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

  let changedItem: InventoryItem | undefined;
  const inventory =
    delta === 0
      ? state.inventory
      : state.inventory.map((i) => {
          if (i.id !== existing.itemId) return i;
          changedItem = {
            ...i,
            availableQuantity: Math.max(
              0,
              Math.min(i.totalQuantity, i.availableQuantity + delta)
            ),
            lastUpdated: todayISO(),
          };
          return changedItem;
        });

  const updatedLog: BorrowLog = {
    ...existing,
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
      draft.status === "Returned" ? draft.actualReturnDate || undefined : undefined,
  };

  setState({
    inventory,
    logs: state.logs.map((l) => (l.id === id ? updatedLog : l)),
  });

  pushLogUpserts([updatedLog]);
  if (changedItem) pushItemUpserts([changedItem]);
}

/**
 * Delete a log. If it was still outstanding, its quantity is returned to the
 * linked item's available stock (the loan is being undone).
 */
export function deleteLog(id: string): void {
  const existing = state.logs.find((l) => l.id === id);
  if (!existing) return;

  const restore = outstandingQty(existing);

  let changedItem: InventoryItem | undefined;
  const inventory =
    restore === 0
      ? state.inventory
      : state.inventory.map((i) => {
          if (i.id !== existing.itemId) return i;
          changedItem = {
            ...i,
            availableQuantity: Math.min(
              i.totalQuantity,
              i.availableQuantity + restore
            ),
            lastUpdated: todayISO(),
          };
          return changedItem;
        });

  setState({
    inventory,
    logs: state.logs.filter((l) => l.id !== id),
  });

  pushLogDelete(id);
  if (changedItem) pushItemUpserts([changedItem]);
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

  let changedItem: InventoryItem | undefined;
  const inventory = state.inventory.map((i) => {
    if (i.id !== log.itemId) return i;
    changedItem = {
      ...i,
      // Never exceed the total on hand.
      availableQuantity: Math.min(i.totalQuantity, i.availableQuantity + log.quantity),
      lastUpdated: todayISO(),
    };
    return changedItem;
  });

  const updatedLog: BorrowLog = {
    ...log,
    status: "Returned",
    actualReturnDate: input.actualReturnDate,
  };

  setState({
    inventory,
    logs: state.logs.map((l) => (l.id === input.logId ? updatedLog : l)),
  });

  pushLogUpserts([updatedLog]);
  if (changedItem) pushItemUpserts([changedItem]);
  return { ok: true };
}

export interface ReturnManyInput {
  /** The outstanding loans (logs) being returned together. */
  logIds: string[];
  actualReturnDate: string;
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

  const nextInventory = state.inventory.map((i) => {
    const add = restore.get(i.id) ?? 0;
    return add
      ? {
          ...i,
          availableQuantity: Math.min(i.totalQuantity, i.availableQuantity + add),
          lastUpdated: todayISO(),
        }
      : i;
  });
  const changedItems = nextInventory.filter((i) => restore.has(i.id));

  const updatedLogs: BorrowLog[] = [];
  const logs = state.logs.map((l) => {
    if (!unique.has(l.id)) return l;
    const updated: BorrowLog = {
      ...l,
      status: "Returned",
      actualReturnDate: input.actualReturnDate,
    };
    updatedLogs.push(updated);
    return updated;
  });

  setState({ inventory: nextInventory, logs });

  pushLogUpserts(updatedLogs);
  pushItemUpserts(changedItems);
  return { ok: true };
}
