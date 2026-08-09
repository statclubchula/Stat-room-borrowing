/**
 * lib/mock-data.ts
 *
 * Mock inventory data matching the Stat Room inventory schema.
 * Swap this out for the Google Sheets API (or Supabase) later — keep the
 * `InventoryItem` shape and the rest of the UI keeps working.
 */

/**
 * Item categories. Items that must be brought back — "Equipment" (อุปกรณ์) and
 * "Circulating" (วัสดุหมุนเวียน, e.g. pens) — require a return date in the borrow
 * form. "Non-circulating" (วัสดุไม่หมุนเวียน) is consumed and taken without a due
 * date. See `categoryNeedsReturnDate`.
 */
export type ItemCategory = "Equipment" | "Circulating" | "Non-circulating";

export interface InventoryItem {
  /** Stable unique id (would be the Sheet row id / Supabase PK in production). */
  id: string;
  /** Item Name — ชื่อ */
  name: string;
  /** Category — ประเภท: อุปกรณ์ (Equipment) / วัสดุไม่หมุนเวียน (Non-circulating) */
  category: ItemCategory;
  /** Total Quantity — จำนวนทั้งหมด */
  totalQuantity: number;
  /** Available Quantity — จำนวนที่เหลืออยู่ */
  availableQuantity: number;
  /** Unit — หน่วย (เช่น ชิ้น, กล่อง, รีม) */
  unit: string;
  /** Storage Location — สถานที่เก็บ */
  location: string;
  /** Location / item Photo URL — รูปสถานที่เก็บ (optional) */
  photoUrl?: string;
  /** Last Updated Date — วันที่อัปเดตข้อมูลล่าสุด (ISO yyyy-mm-dd) */
  lastUpdated: string;
}

/** Thai display labels for each category (used by badges / indicators). */
export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  Equipment: "อุปกรณ์",
  Circulating: "วัสดุหมุนเวียน",
  "Non-circulating": "วัสดุไม่หมุนเวียน",
};

/** Tailwind text-color class per category (shared by the admin table & borrow form). */
export const CATEGORY_TEXT_COLORS: Record<ItemCategory, string> = {
  Equipment: "text-primary",
  Circulating: "text-emerald-500",
  "Non-circulating": "text-amber-500",
};

/**
 * Whether borrowing this category requires an expected return date.
 * True for items that must be brought back (อุปกรณ์ + วัสดุหมุนเวียน);
 * false for consumed วัสดุไม่หมุนเวียน.
 */
export function categoryNeedsReturnDate(category: ItemCategory): boolean {
  return category !== "Non-circulating";
}

export const inventory: InventoryItem[] = [
  {
    id: "itm-001",
    name: "เครื่องคิดเลขวิทยาศาสตร์ Casio fx-991",
    category: "Equipment",
    totalQuantity: 15,
    availableQuantity: 12,
    unit: "เครื่อง",
    location: "ตู้ A ชั้น 1",
    photoUrl: "",
    lastUpdated: "2026-07-28",
  },
  {
    id: "itm-002",
    name: "โน้ตบุ๊กสำหรับยืม",
    category: "Equipment",
    totalQuantity: 4,
    availableQuantity: 2,
    unit: "เครื่อง",
    location: "ตู้เก็บอุปกรณ์ (ล็อกกุญแจ)",
    photoUrl: "",
    lastUpdated: "2026-08-01",
  },
  {
    id: "itm-003",
    name: "โปรเจกเตอร์พกพา",
    category: "Equipment",
    totalQuantity: 2,
    availableQuantity: 2,
    unit: "เครื่อง",
    location: "ชั้นวางหลังห้อง",
    photoUrl: "",
    lastUpdated: "2026-07-15",
  },
  {
    id: "itm-004",
    name: "สาย HDMI (3 เมตร)",
    category: "Equipment",
    totalQuantity: 6,
    availableQuantity: 5,
    unit: "เส้น",
    location: "กล่องอุปกรณ์ไฟฟ้า",
    photoUrl: "",
    lastUpdated: "2026-07-20",
  },
  {
    id: "itm-005",
    name: "ปลั๊กพ่วง 5 ช่อง",
    category: "Equipment",
    totalQuantity: 5,
    availableQuantity: 4,
    unit: "อัน",
    location: "ตู้ B ชั้น 2",
    photoUrl: "",
    lastUpdated: "2026-07-30",
  },
  {
    id: "itm-006",
    name: "ไมโครโฟนไร้สาย",
    category: "Equipment",
    totalQuantity: 3,
    availableQuantity: 0,
    unit: "ตัว",
    location: "ตู้อุปกรณ์เสียง",
    photoUrl: "",
    lastUpdated: "2026-06-29",
  },
  {
    id: "itm-007",
    name: "กระดาษ A4 (80 แกรม)",
    category: "Non-circulating",
    totalQuantity: 40,
    availableQuantity: 33,
    unit: "รีม",
    location: "ตู้เก็บวัสดุ ชั้น 3",
    photoUrl: "",
    lastUpdated: "2026-08-02",
  },
  {
    id: "itm-008",
    name: "ปากกาไวท์บอร์ด",
    category: "Non-circulating",
    totalQuantity: 60,
    availableQuantity: 41,
    unit: "ด้าม",
    location: "ลิ้นชักโต๊ะกลาง",
    photoUrl: "",
    lastUpdated: "2026-07-27",
  },
  {
    id: "itm-009",
    name: "กระดาษโพสต์อิท",
    category: "Non-circulating",
    totalQuantity: 30,
    availableQuantity: 18,
    unit: "แพ็ก",
    location: "ลิ้นชักโต๊ะกลาง",
    photoUrl: "",
    lastUpdated: "2026-07-22",
  },
  {
    id: "itm-010",
    name: "ถ่าน AA (แพ็ก 4 ก้อน)",
    category: "Non-circulating",
    totalQuantity: 20,
    availableQuantity: 4,
    unit: "แพ็ก",
    location: "กล่องอุปกรณ์ไฟฟ้า",
    photoUrl: "",
    lastUpdated: "2026-08-03",
  },
];

/* ------------------------------------------------------------------ */
/*  Inventory stock status                                            */
/* ------------------------------------------------------------------ */

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export interface StockStatusMeta {
  status: StockStatus;
  /** English label. */
  label: string;
  /** Thai label. */
  labelTh: string;
}

/** Fraction of total at/under which an item counts as "Low Stock". */
export const LOW_STOCK_RATIO = 0.25;

/** Derive a stock status from an item's available vs. total quantity. */
export function getStockStatus(item: InventoryItem): StockStatusMeta {
  if (item.availableQuantity <= 0) {
    return { status: "out-of-stock", label: "Out of Stock", labelTh: "หมด" };
  }
  const threshold = Math.ceil(item.totalQuantity * LOW_STOCK_RATIO);
  if (item.availableQuantity <= threshold) {
    return { status: "low-stock", label: "Low Stock", labelTh: "ใกล้หมด" };
  }
  return { status: "in-stock", label: "In Stock", labelTh: "พร้อมให้ยืม" };
}

/* ------------------------------------------------------------------ */
/*  Borrow logs                                                        */
/* ------------------------------------------------------------------ */

/**
 * Stored borrow status. "Overdue" is *derived* at read time (a Borrowed
 * item past its expected return date) — see `resolveLogStatus`.
 */
export type BorrowStatus = "Borrowed" | "Returned" | "Overdue";

export interface BorrowLog {
  id: string;
  itemId: string;
  /** Snapshot of the item name at borrow time. */
  itemName: string;
  /** Borrower nickname — ชื่อเล่น */
  borrowerName: string;
  /** ชั้นปี */
  year: string;
  /** ภาค/สาขา */
  major: string;
  /** ช่องทางติดต่อ */
  contact: string;
  quantity: number;
  unit: string;
  /** yyyy-mm-dd */
  borrowDate: string;
  /** Expected return date — only for returnable items (อุปกรณ์ / วัสดุหมุนเวียน); may be empty. */
  expectedReturnDate?: string;
  /** Set once the item is actually returned. */
  actualReturnDate?: string;
  /** Borrow-time proof photo as a data URL. In-memory only — lost on reload. */
  proofPhoto?: string;
  /** Return-time condition photo as a data URL. In-memory only. */
  returnProofPhoto?: string;
  /** Base status as stored ("Borrowed" or "Returned"). */
  status: Exclude<BorrowStatus, "Overdue">;
}

export const CATEGORY_STATUS_LABELS: Record<BorrowStatus, string> = {
  Borrowed: "กำลังยืม",
  Returned: "คืนแล้ว",
  Overdue: "เกินกำหนด",
};

/**
 * Resolve the *effective* status: a still-borrowed item whose expected
 * return date has passed becomes "Overdue".
 */
export function resolveLogStatus(log: BorrowLog, today: string): BorrowStatus {
  if (
    log.status === "Borrowed" &&
    log.expectedReturnDate &&
    log.expectedReturnDate < today
  ) {
    return "Overdue";
  }
  return log.status;
}

export const borrowLogs: BorrowLog[] = [
  {
    id: "log-001",
    itemId: "itm-001",
    itemName: "เครื่องคิดเลขวิทยาศาสตร์ Casio fx-991",
    borrowerName: "มายด์",
    year: "ปี 2",
    major: "สถิติ",
    contact: "0812345678",
    quantity: 1,
    unit: "เครื่อง",
    borrowDate: "2026-08-01",
    expectedReturnDate: "2026-08-08",
    status: "Borrowed",
  },
  {
    id: "log-002",
    itemId: "itm-002",
    itemName: "โน้ตบุ๊กสำหรับยืม",
    borrowerName: "บีม",
    year: "ปี 3",
    major: "คณิตศาสตร์",
    contact: "Line: beam_k",
    quantity: 1,
    unit: "เครื่อง",
    borrowDate: "2026-07-20",
    expectedReturnDate: "2026-07-27",
    status: "Borrowed", // → Overdue (expected 07-27 < today 08-05)
  },
  {
    id: "log-003",
    itemId: "itm-003",
    itemName: "โปรเจกเตอร์พกพา",
    borrowerName: "ปอนด์",
    year: "ปี 4",
    major: "สถิติประยุกต์",
    contact: "pond@example.com",
    quantity: 1,
    unit: "เครื่อง",
    borrowDate: "2026-07-10",
    expectedReturnDate: "2026-07-17",
    actualReturnDate: "2026-07-16",
    status: "Returned",
  },
  {
    id: "log-004",
    itemId: "itm-007",
    itemName: "กระดาษ A4 (80 แกรม)",
    borrowerName: "น้ำ",
    year: "ปี 1",
    major: "สถิติ",
    contact: "0898765432",
    quantity: 2,
    unit: "รีม",
    borrowDate: "2026-08-03",
    status: "Returned",
    actualReturnDate: "2026-08-03",
  },
  {
    id: "log-005",
    itemId: "itm-005",
    itemName: "ปลั๊กพ่วง 5 ช่อง",
    borrowerName: "ต้นน้ำ",
    year: "ปี 2",
    major: "วิทยาการข้อมูล",
    contact: "Line: tonnam.ds",
    quantity: 1,
    unit: "อัน",
    borrowDate: "2026-08-04",
    expectedReturnDate: "2026-08-11",
    status: "Borrowed",
  },
  {
    id: "log-006",
    itemId: "itm-004",
    itemName: "สาย HDMI (3 เมตร)",
    borrowerName: "ฟ้า",
    year: "ปี 3",
    major: "สถิติ",
    contact: "0876543210",
    quantity: 1,
    unit: "เส้น",
    borrowDate: "2026-07-15",
    expectedReturnDate: "2026-07-22",
    status: "Borrowed", // → Overdue
  },
];
