"use client";

import * as React from "react";
import { Loader2, Upload, CalendarClock, X } from "lucide-react";

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
import { useInventory, borrowItem } from "@/lib/store";
import {
  EMPTY_USER_INFO,
  todayISO,
  validateUserInfo,
  readProofImage,
  type UserInfo,
} from "@/lib/borrow-utils";

export function BorrowForm() {
  const inventory = useInventory();
  const [user, setUser] = React.useState<UserInfo>(EMPTY_USER_INFO);
  const [itemId, setItemId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [borrowDate, setBorrowDate] = React.useState(todayISO());
  const [returnDate, setReturnDate] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [proofPhoto, setProofPhoto] = React.useState("");
  const [proofError, setProofError] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<ToastData | null>(null);

  const selectedItem = inventory.find((i) => i.id === itemId) ?? null;
  // ---- Core conditional rule ----
  // Expected Return Date is required for items that must be brought back —
  // "Equipment" (อุปกรณ์) and "Circulating" (วัสดุหมุนเวียน). It is hidden for
  // consumed "Non-circulating" (วัสดุไม่หมุนเวียน) items.
  const needsReturnDate = selectedItem
    ? categoryNeedsReturnDate(selectedItem.category)
    : false;

  // ---- Live stock check ----
  // Warn the moment the typed quantity exceeds what's left, before submit.
  const liveQuantityError = React.useMemo(() => {
    if (!selectedItem) return "";
    const qty = Number(quantity);
    if (quantity && Number.isFinite(qty) && qty > selectedItem.availableQuantity) {
      return `เกินจำนวนคงเหลือ — เหลือเพียง ${selectedItem.availableQuantity} ${selectedItem.unit}`;
    }
    return "";
  }, [quantity, selectedItem]);

  function validate(): Record<string, string> {
    const errs = validateUserInfo(user);

    if (!itemId) errs.itemId = "กรุณาเลือกอุปกรณ์/วัสดุ";

    const qty = Number(quantity);
    if (!quantity || Number.isNaN(qty) || qty < 1) {
      errs.quantity = "จำนวนต้องมากกว่า 0";
    } else if (selectedItem && qty > selectedItem.availableQuantity) {
      errs.quantity = `คงเหลือเพียง ${selectedItem.availableQuantity} ${selectedItem.unit}`;
    }

    if (!borrowDate) errs.borrowDate = "กรุณาเลือกวันที่ยืม";

    if (needsReturnDate) {
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
    setItemId("");
    setQuantity("1");
    setBorrowDate(todayISO());
    setReturnDate("");
    clearProof();
    setErrors({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const itemName = selectedItem?.name;
    const unit = selectedItem?.unit;
    // Simulate an async save (Google Sheets / Supabase later).
    setTimeout(() => {
      setSubmitting(false);
      const result = borrowItem({
        user,
        itemId,
        quantity: Number(quantity),
        borrowDate,
        expectedReturnDate: needsReturnDate ? returnDate : undefined,
        proofPhoto: proofPhoto || undefined,
      });

      if (!result.ok) {
        setErrors((prev) => ({ ...prev, itemId: result.error ?? "บันทึกไม่สำเร็จ" }));
        return;
      }

      setToast({
        title: "บันทึกการยืมสำเร็จ ✅",
        description: `${user.nickname} ยืม ${itemName} จำนวน ${quantity} ${unit}`,
      });
      resetForm();
    }, 700);
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* ---- User info ---- */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            ข้อมูลผู้ยืม
          </h3>
          <UserInfoFields value={user} onChange={setUser} errors={errors} />
        </section>

        {/* ---- Item / quantity / dates ---- */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            รายละเอียดการยืม
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Item selection */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="item">
                เลือกอุปกรณ์/วัสดุ <span className="text-primary">*</span>
              </Label>
              <Select
                id="item"
                value={itemId}
                onChange={(e) => {
                  setItemId(e.target.value);
                  // Clear a stale return date when switching to a non-circulating item.
                  setErrors((prev) => ({ ...prev, itemId: "", returnDate: "" }));
                }}
                aria-invalid={!!errors.itemId}
              >
                <option value="">— เลือกรายการ —</option>
                {inventory.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={item.availableQuantity <= 0}
                  >
                    {item.name} ({CATEGORY_LABELS[item.category]}) · เหลือ{" "}
                    {item.availableQuantity} {item.unit}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.itemId} />
              {selectedItem && (
                <p className="text-xs text-muted-foreground">
                  ประเภท:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      CATEGORY_TEXT_COLORS[selectedItem.category]
                    )}
                  >
                    {CATEGORY_LABELS[selectedItem.category]}
                  </span>{" "}
                  · เก็บที่ {selectedItem.location}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="quantity">
                จำนวน <span className="text-primary">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={selectedItem?.availableQuantity ?? undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                aria-invalid={!!errors.quantity || !!liveQuantityError}
              />
              <FieldError message={errors.quantity || liveQuantityError} />
              {selectedItem && !liveQuantityError && (
                <p className="text-xs text-muted-foreground">
                  คงเหลือ {selectedItem.availableQuantity} {selectedItem.unit}
                </p>
              )}
            </div>

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

            {/* Expected return date — items that must be returned.
                Pops in when a returnable item is picked. */}
            {needsReturnDate && (
              <div
                key={selectedItem?.id}
                className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-4 duration-300 animate-in fade-in slide-in-from-top-2 zoom-in-95 motion-reduce:animate-none sm:col-span-2"
              >
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
        <div className="flex justify-end">
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
