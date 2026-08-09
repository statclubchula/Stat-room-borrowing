"use client";

import * as React from "react";
import { Loader2, Upload, CalendarClock, X, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FieldError } from "@/components/ui/field-error";
import { UserInfoFields } from "@/components/user-info-fields";
import { SuccessToast, type ToastData } from "@/components/ui/toast";
import {
  CATEGORY_LABELS,
  CATEGORY_TEXT_COLORS,
  categoryNeedsReturnDate,
} from "@/lib/mock-data";
import { useInventory, borrowItems } from "@/lib/store";
import {
  EMPTY_USER_INFO,
  todayISO,
  validateUserInfo,
  readProofImage,
  type UserInfo,
} from "@/lib/borrow-utils";

/** One row in the borrow list — an item plus how many of it. */
interface BorrowLine {
  /** Stable local id for React keys / per-line error lookup. */
  key: string;
  itemId: string;
  quantity: string;
}

const firstLine = (): BorrowLine => ({ key: "line-1", itemId: "", quantity: "1" });

export function BorrowForm() {
  const inventory = useInventory();
  const [user, setUser] = React.useState<UserInfo>(EMPTY_USER_INFO);
  const [lines, setLines] = React.useState<BorrowLine[]>(() => [firstLine()]);
  const [borrowDate, setBorrowDate] = React.useState(todayISO());
  const [returnDate, setReturnDate] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [proofPhoto, setProofPhoto] = React.useState("");
  const [proofError, setProofError] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<ToastData | null>(null);
  // Bumped on reset to remount UserInfoFields (clears its "อื่น ๆ" mode).
  const [formKey, setFormKey] = React.useState(0);

  // Monotonic counter for new line keys (line-2, line-3, …).
  const lineSeq = React.useRef(1);
  function makeLine(): BorrowLine {
    lineSeq.current += 1;
    return { key: `line-${lineSeq.current}`, itemId: "", quantity: "1" };
  }

  // ---- Core conditional rule ----
  // Expected Return Date is required as soon as ANY chosen item must be brought
  // back — "Equipment" (อุปกรณ์) / "Circulating" (วัสดุหมุนเวียน). It stays hidden
  // while every chosen item is a consumed "Non-circulating" (วัสดุไม่หมุนเวียน).
  const anyNeedsReturnDate = lines.some((ln) => {
    const item = inventory.find((i) => i.id === ln.itemId);
    return item ? categoryNeedsReturnDate(item.category) : false;
  });

  // ---- Live stock check ----
  // Warn the moment a line's quantity (aggregated for repeated items) exceeds
  // what's left, before submit. Keyed by line key.
  const liveLineErrors = React.useMemo(() => {
    const demand = new Map<string, number>();
    const out: Record<string, string> = {};
    for (const ln of lines) {
      const item = inventory.find((i) => i.id === ln.itemId);
      if (!item) continue;
      const qty = Number(ln.quantity);
      if (!ln.quantity || !Number.isFinite(qty) || qty <= 0) continue;
      const cum = (demand.get(item.id) ?? 0) + qty;
      demand.set(item.id, cum);
      if (cum > item.availableQuantity) {
        out[ln.key] = `เกินจำนวนคงเหลือ — เหลือเพียง ${item.availableQuantity} ${item.unit}`;
      }
    }
    return out;
  }, [lines, inventory]);

  function updateLine(key: string, patch: Partial<BorrowLine>) {
    setLines((prev) => prev.map((ln) => (ln.key === key ? { ...ln, ...patch } : ln)));
  }

  function addLine() {
    // Build the line outside the updater so its key isn't consumed twice under
    // React's StrictMode double-invocation.
    const line = makeLine();
    setLines((prev) => [...prev, line]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((ln) => ln.key !== key) : prev));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`line-item-${key}`];
      delete next[`line-qty-${key}`];
      return next;
    });
  }

  function validate(): Record<string, string> {
    const errs = validateUserInfo(user);

    // Per-line: item picked + a valid quantity within (aggregated) stock.
    const demand = new Map<string, number>();
    lines.forEach((ln) => {
      if (!ln.itemId) {
        errs[`line-item-${ln.key}`] = "กรุณาเลือกอุปกรณ์/วัสดุ";
        return;
      }
      const item = inventory.find((i) => i.id === ln.itemId);
      const qty = Number(ln.quantity);
      if (!ln.quantity || Number.isNaN(qty) || qty < 1) {
        errs[`line-qty-${ln.key}`] = "จำนวนต้องมากกว่า 0";
        return;
      }
      if (item) {
        const cum = (demand.get(item.id) ?? 0) + qty;
        demand.set(item.id, cum);
        if (cum > item.availableQuantity) {
          errs[`line-qty-${ln.key}`] = `คงเหลือเพียง ${item.availableQuantity} ${item.unit}`;
        }
      }
    });

    if (!borrowDate) errs.borrowDate = "กรุณาเลือกวันที่ยืม";

    if (anyNeedsReturnDate) {
      if (!returnDate) {
        errs.returnDate = "กรุณาเลือกวันที่คาดว่าจะคืน";
      } else if (returnDate < borrowDate) {
        errs.returnDate = "วันที่คืนต้องไม่ก่อนวันที่ยืม";
      }
    }

    return errs;
  }

  async function handleProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      clearProof();
      return;
    }
    const { dataUrl, error } = await readProofImage(file);
    if (error || !dataUrl) {
      setProofError(error ?? "อ่านไฟล์ไม่สำเร็จ");
      setFileName("");
      setProofPhoto("");
      return;
    }
    setProofError("");
    setFileName(file.name);
    setProofPhoto(dataUrl);
  }

  function clearProof() {
    setFileName("");
    setProofPhoto("");
    setProofError("");
  }

  function resetForm() {
    setUser(EMPTY_USER_INFO);
    lineSeq.current = 1;
    setLines([firstLine()]);
    setBorrowDate(todayISO());
    setReturnDate("");
    clearProof();
    setErrors({});
    setFormKey((k) => k + 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const summary = lines
      .map((ln) => {
        const item = inventory.find((i) => i.id === ln.itemId);
        return item ? `${item.name} × ${ln.quantity} ${item.unit}` : "";
      })
      .filter(Boolean);

    // Simulate an async save (Google Sheets / Supabase later).
    setTimeout(() => {
      setSubmitting(false);
      const result = borrowItems({
        user,
        borrowDate,
        expectedReturnDate: anyNeedsReturnDate ? returnDate : undefined,
        proofPhoto: proofPhoto || undefined,
        lines: lines.map((ln) => ({ itemId: ln.itemId, quantity: Number(ln.quantity) })),
      });

      if (!result.ok) {
        setErrors((prev) => ({ ...prev, form: result.error ?? "บันทึกไม่สำเร็จ" }));
        return;
      }

      setToast({
        title: "บันทึกการยืมสำเร็จ ✅",
        description:
          summary.length > 1
            ? `${user.nickname} ยืม ${summary.length} รายการ: ${summary.join(", ")}`
            : `${user.nickname} ยืม ${summary[0]}`,
      });
      resetForm();
    }, 700);
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* ---- User info ---- */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">ข้อมูลผู้ยืม</h3>
          <UserInfoFields
            key={formKey}
            value={user}
            onChange={setUser}
            errors={errors}
          />
        </section>

        {/* ---- Items (merged item + quantity, repeatable) ---- */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            รายการที่ต้องการยืม
          </h3>

          <div className="space-y-3">
            {lines.map((ln, idx) => {
              const item = inventory.find((i) => i.id === ln.itemId) ?? null;
              const itemErr = errors[`line-item-${ln.key}`];
              const qtyErr = errors[`line-qty-${ln.key}`] || liveLineErrors[ln.key];
              return (
                <div
                  key={ln.key}
                  className="rounded-lg border border-border bg-muted/20 p-3 duration-200 animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none sm:p-4"
                >
                  {/* Row header: index + remove */}
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      รายการที่ {idx + 1}
                    </span>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(ln.key)}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        aria-label={`ลบรายการที่ ${idx + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        ลบ
                      </button>
                    )}
                  </div>

                  {/* Item (left) + Quantity (right) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem]">
                    {/* Item */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`item-${ln.key}`}>
                        เลือกอุปกรณ์/วัสดุ <span className="text-primary">*</span>
                      </Label>
                      <Select
                        id={`item-${ln.key}`}
                        value={ln.itemId}
                        onChange={(e) => {
                          updateLine(ln.key, { itemId: e.target.value });
                          setErrors((prev) => ({
                            ...prev,
                            [`line-item-${ln.key}`]: "",
                            returnDate: "",
                          }));
                        }}
                        aria-invalid={!!itemErr}
                      >
                        <option value="">— เลือกรายการ —</option>
                        {inventory.map((it) => (
                          <option
                            key={it.id}
                            value={it.id}
                            disabled={it.availableQuantity <= 0}
                          >
                            {it.name} ({CATEGORY_LABELS[it.category]}) · เหลือ{" "}
                            {it.availableQuantity} {it.unit}
                          </option>
                        ))}
                      </Select>
                      <FieldError message={itemErr} />
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`qty-${ln.key}`}>
                        จำนวน <span className="text-primary">*</span>
                      </Label>
                      <Input
                        id={`qty-${ln.key}`}
                        type="number"
                        min={1}
                        max={item?.availableQuantity ?? undefined}
                        value={ln.quantity}
                        onChange={(e) => updateLine(ln.key, { quantity: e.target.value })}
                        aria-invalid={!!qtyErr}
                      />
                    </div>
                  </div>

                  {/* Per-line footnotes: category + quantity error */}
                  {item && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      ประเภท:{" "}
                      <span
                        className={cn(
                          "font-medium",
                          CATEGORY_TEXT_COLORS[item.category]
                        )}
                      >
                        {CATEGORY_LABELS[item.category]}
                      </span>{" "}
                      · เก็บที่ {item.location}
                    </p>
                  )}
                  <FieldError message={qtyErr} />
                </div>
              );
            })}
          </div>

          {/* Add another item */}
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            เพิ่มรายการ
          </button>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Borrow date */}
            <div className="space-y-1.5">
              <Label htmlFor="borrowDate">
                วันที่ยืม <span className="text-primary">*</span>
              </Label>
              <Input
                id="borrowDate"
                type="date"
                value={borrowDate}
                onChange={(e) => setBorrowDate(e.target.value)}
                aria-invalid={!!errors.borrowDate}
              />
              <FieldError message={errors.borrowDate} />
            </div>

            {/* Expected return date — shown when any chosen item must be returned.
                Pops in when a returnable item is picked. */}
            {anyNeedsReturnDate && (
              <div className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-4 duration-300 animate-in fade-in slide-in-from-top-2 zoom-in-95 motion-reduce:animate-none sm:col-span-2">
                <Label htmlFor="returnDate">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    วันที่คาดว่าจะคืน <span className="text-primary">*</span>
                  </span>
                </Label>
                <Input
                  id="returnDate"
                  type="date"
                  min={borrowDate}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  aria-invalid={!!errors.returnDate}
                />
                <FieldError message={errors.returnDate} />
                <p className="text-xs text-muted-foreground">
                  จำเป็นสำหรับ &quot;อุปกรณ์&quot; และ &quot;วัสดุหมุนเวียน&quot; ที่ต้องนำมาคืน
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ---- Photo / proof attachment ---- */}
        <section className="space-y-1.5">
          <Label htmlFor="proof">แนบรูป/หลักฐาน (ถ้ามี)</Label>
          <label
            htmlFor="proof"
            className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-input bg-background px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Upload className="h-4 w-4" />
            {fileName || "เลือกไฟล์รูปภาพ…"}
          </label>
          <input
            id="proof"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleProofChange}
          />
          <FieldError message={proofError} />
          {proofPhoto && (
            <div className="flex items-center gap-3 pt-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofPhoto}
                alt="ตัวอย่างรูปหลักฐาน"
                className="h-16 w-16 rounded-md border border-border object-cover"
              />
              <button
                type="button"
                onClick={clearProof}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
                ลบรูป
              </button>
            </div>
          )}
        </section>

        {/* ---- Submit ---- */}
        <div className="flex flex-col items-end gap-2">
          <FieldError message={errors.form} />
          <Button type="submit" disabled={submitting} className="min-w-32">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังบันทึก…
              </>
            ) : (
              "ยืนยันการยืม"
            )}
          </Button>
        </div>
      </form>

      <SuccessToast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
