"use client";

import * as React from "react";
import { Loader2, Upload, PackageCheck, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FieldError } from "@/components/ui/field-error";
import { UserInfoFields } from "@/components/user-info-fields";
import { SuccessToast, type ToastData } from "@/components/ui/toast";
import { resolveLogStatus } from "@/lib/mock-data";
import { useLogs, returnLoan } from "@/lib/store";
import {
  EMPTY_USER_INFO,
  todayISO,
  validateUserInfo,
  type UserInfo,
} from "@/lib/borrow-utils";

export function ReturnForm() {
  const logs = useLogs();
  const today = todayISO();

  const [user, setUser] = React.useState<UserInfo>(EMPTY_USER_INFO);
  const [logId, setLogId] = React.useState("");
  const [returnDate, setReturnDate] = React.useState(todayISO());
  const [fileName, setFileName] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<ToastData | null>(null);

  // Only still-outstanding loans can be returned (Borrowed → includes Overdue).
  const activeLoans = logs.filter((l) => l.status === "Borrowed");
  const selectedLoan = activeLoans.find((l) => l.id === logId) ?? null;
  const selectedIsOverdue =
    selectedLoan && resolveLogStatus(selectedLoan, today) === "Overdue";

  function validate(): Record<string, string> {
    const errs = validateUserInfo(user);
    if (!logId) errs.logId = "กรุณาเลือกรายการที่คืน";
    if (!returnDate) {
      errs.returnDate = "กรุณาเลือกวันที่คืนจริง";
    } else if (selectedLoan && returnDate < selectedLoan.borrowDate) {
      errs.returnDate = "วันที่คืนต้องไม่ก่อนวันที่ยืม";
    }
    return errs;
  }

  function resetForm() {
    setUser(EMPTY_USER_INFO);
    setLogId("");
    setReturnDate(todayISO());
    setFileName("");
    setErrors({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const summary = selectedLoan
      ? `${selectedLoan.itemName} จำนวน ${selectedLoan.quantity} ${selectedLoan.unit}`
      : "";
    setTimeout(() => {
      setSubmitting(false);
      const result = returnLoan({ logId, actualReturnDate: returnDate });

      if (!result.ok) {
        setErrors((prev) => ({ ...prev, logId: result.error ?? "บันทึกไม่สำเร็จ" }));
        return;
      }

      setToast({
        title: "บันทึกการคืนสำเร็จ ✅",
        description: `${user.nickname} คืน ${summary}`,
      });
      resetForm();
    }, 700);
  }

  // Nothing is currently borrowed → friendly empty state.
  if (activeLoans.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-12 text-center">
        <PackageCheck className="h-8 w-8 text-emerald-500" />
        <p className="text-sm text-muted-foreground">
          ไม่มีรายการที่ต้องคืนในขณะนี้ — ทุกอย่างถูกคืนครบแล้ว 🎉
        </p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* ---- User info ---- */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">ข้อมูลผู้คืน</h3>
          <UserInfoFields value={user} onChange={setUser} errors={errors} />
        </section>

        {/* ---- Loan selection / date ---- */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            รายละเอียดการคืน
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Outstanding loan selection */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="return-loan">
                รายการที่คืน <span className="text-primary">*</span>
              </Label>
              <Select
                id="return-loan"
                value={logId}
                onChange={(e) => {
                  setLogId(e.target.value);
                  setErrors((prev) => ({ ...prev, logId: "" }));
                }}
                aria-invalid={!!errors.logId}
              >
                <option value="">— เลือกรายการที่ยืมไว้ —</option>
                {activeLoans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.itemName} · {loan.borrowerName} · {loan.quantity}{" "}
                    {loan.unit} (ยืม {loan.borrowDate})
                  </option>
                ))}
              </Select>
              <FieldError message={errors.logId} />

              {selectedLoan && (
                <div className="mt-1.5 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>
                      ยืมโดย{" "}
                      <span className="font-medium text-foreground">
                        {selectedLoan.borrowerName}
                      </span>{" "}
                      · {selectedLoan.year} · {selectedLoan.major}
                    </span>
                    {selectedIsOverdue && (
                      <Badge variant="danger">
                        <AlertTriangle className="h-3 w-3" />
                        เกินกำหนด
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1">
                    จำนวนที่จะคืน:{" "}
                    <span className="font-medium text-foreground">
                      {selectedLoan.quantity} {selectedLoan.unit}
                    </span>
                    {selectedLoan.expectedReturnDate && (
                      <> · กำหนดคืน {selectedLoan.expectedReturnDate}</>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actual return date */}
            <div className="space-y-1.5">
              <Label htmlFor="actualReturnDate">
                วันที่คืนจริง <span className="text-primary">*</span>
              </Label>
              <Input
                id="actualReturnDate"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                aria-invalid={!!errors.returnDate}
              />
              <FieldError message={errors.returnDate} />
            </div>
          </div>
        </section>

        {/* ---- Photo / proof attachment ---- */}
        <section className="space-y-1.5">
          <Label htmlFor="return-proof">แนบรูปสภาพของที่คืน (ถ้ามี)</Label>
          <label
            htmlFor="return-proof"
            className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-input bg-background px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Upload className="h-4 w-4" />
            {fileName || "เลือกไฟล์รูปภาพ…"}
          </label>
          <input
            id="return-proof"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
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
              "ยืนยันการคืน"
            )}
          </Button>
        </div>
      </form>

      <SuccessToast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
