/**
 * lib/supabase.ts
 *
 * Single shared Supabase browser client for the whole app. It talks to the
 * project with the *anon* key (safe to ship — every table is guarded by RLS).
 *
 * If the env vars are missing (e.g. a fresh clone with no `.env.local`), we
 * export `null` instead of throwing so the app still builds and runs on the
 * in-memory seed data. `lib/store.ts` treats a null client as "offline".
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

/** True when the client is configured — handy for one-off guards. */
export const isSupabaseConfigured = supabase !== null;

/* ------------------------------------------------------------------ */
/*  Row <-> app-type mapping (DB is snake_case; the app is camelCase)  */
/* ------------------------------------------------------------------ */

import type { InventoryItem, BorrowLog } from "@/lib/mock-data";

/** Shape of a `public.inventory` row as returned by PostgREST. */
export interface InventoryRow {
  id: string;
  name: string;
  category: InventoryItem["category"];
  total_quantity: number;
  available_quantity: number;
  unit: string;
  location: string;
  photo_url: string | null;
  last_updated: string;
}

/** Shape of a `public.borrow_logs` row as returned by PostgREST. */
export interface BorrowLogRow {
  id: string;
  item_id: string | null;
  item_name: string;
  borrower_name: string;
  year: string;
  major: string;
  contact: string;
  quantity: number;
  unit: string;
  borrow_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: BorrowLog["status"];
  created_at?: string;
}

export function itemFromRow(row: InventoryRow): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    totalQuantity: row.total_quantity,
    availableQuantity: row.available_quantity,
    unit: row.unit,
    location: row.location,
    photoUrl: row.photo_url ?? "",
    lastUpdated: row.last_updated,
  };
}

export function rowFromItem(item: InventoryItem): InventoryRow {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    total_quantity: item.totalQuantity,
    available_quantity: item.availableQuantity,
    unit: item.unit,
    location: item.location,
    photo_url: item.photoUrl ?? "",
    last_updated: item.lastUpdated,
  };
}

export function logFromRow(row: BorrowLogRow): BorrowLog {
  return {
    id: row.id,
    itemId: row.item_id ?? "",
    itemName: row.item_name,
    borrowerName: row.borrower_name,
    year: row.year,
    major: row.major,
    contact: row.contact,
    quantity: row.quantity,
    unit: row.unit,
    borrowDate: row.borrow_date,
    expectedReturnDate: row.expected_return_date ?? undefined,
    actualReturnDate: row.actual_return_date ?? undefined,
    status: row.status,
  };
}

export function rowFromLog(log: BorrowLog): BorrowLogRow {
  return {
    id: log.id,
    item_id: log.itemId || null,
    item_name: log.itemName,
    borrower_name: log.borrowerName,
    year: log.year,
    major: log.major,
    contact: log.contact,
    quantity: log.quantity,
    unit: log.unit,
    borrow_date: log.borrowDate,
    expected_return_date: log.expectedReturnDate ?? null,
    actual_return_date: log.actualReturnDate ?? null,
    status: log.status,
  };
}
