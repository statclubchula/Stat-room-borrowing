"use client";

import * as React from "react";
import {
  Loader2,
  PackageCheck,
  AlertTriangle,
  Plus,
  Trash2,
  MessageCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FieldError } from "@/components/ui/field-error";
import { UserInfoFields } from "@/components/user-info-fields";
import { SuccessToast, type ToastData } from "@/components/ui/toast";
import { resolveLogStatus } from "@/lib/mock-data";
import { useLogs, returnLoans } from "@/lib/store";
import {
  EMPTY_USER_INFO,
  todayISO,
  validateUserInfo,
  type UserInfo,
} from "@/lib/borrow-utils";

/** One row in the return list — a single outstanding loan being returned. */
interface ReturnLine {
  /** Stable local id for React keys / per-line error lookup. */
  key: string;
  logId: string;
}

const firstLine = (): ReturnLine => ({ key: "line-1", logId: "" });

export function ReturnForm() {
  const logs = useLogs();
  const today = todayISO();

  const [user, setUser] = React.useState<UserInfo>(EMPTY_USER_INFO);
  const [lines, setLines] = React.useState<ReturnLine[]>(() => [firstLine()]);
  const [returnDate, setReturnDate] = React.useState(todayISO());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<ToastData | null>(null);
  // Bumped on reset to remount UserInfoFields (clears its "อื่น ๆ" mode).
  const [formKey, setFormKey] = React.useState(0);

  // Only still-outstanding loans can be returned (Borrowed → includes Overdue).
  const activeLoans = logs.filter((l) => l.status === "Borrowed");

  // Monotonic counter for new line keys (line-2, line-3, …).
  const lineSeq = React.useRef(1);
  function makeLine(): ReturnLine {
    lineSeq.current += 1;
    return { key: `line-${lineSeq.current}`, logId: "" };
  }

  /** Loan ids already chosen on OTHER rows — disabled to avoid duplicates. */
  function takenElsewhere(exceptKey: string): Set<string> {
    const set = new Set<string>();
    for (const ln of lines) {
      if (ln.key !== exceptKey && ln.logId) set.add(ln.logId);
    }
    return set;
  }

  function updateLine(key: string, patch: Partial<ReturnLine>) {
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
      delete next[`line-loan-${key}`];
      return next;
    });
  }

  function validate(): Record<string, string> {
    const errs = validateUserInfo(user);

    // Per-line: a loan must be picked (dupes are prevented by disabling).
    lines.forEach((ln) => {
      if (!ln.logId) errs[`line-loan-${ln.key}`] = "กรุณาเลือกรายการที่คืน";
    });

    if (!returnDate) {
      errs.returnDate = "กรุณาเลือกวันที่คืนจริง";
    } else {
      // Return date can't precede any selected loan's borrow date.
      const tooEarly = lines.some((ln) => {
        const loan = activeLoans.find((l) => l.id === ln.logId);
        return loan ? returnDate < loan.borrowDate : false;
      });
      if (tooEarly) errs.returnDate = "วันที่คืนต้องไม่ก่อนวันที่ยืม";
    }

    return errs;
  }

  function resetForm() {
    setUser(EMPTY_USER_INFO);
    lineSeq.current = 1;
    setLines([firstLine()]);
    setReturnDate(todayISO());
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
        const loan = activeLoans.find((l) => l.id === ln.logId);
        return loan ? `${loan.itemName} × ${loan.quantity} ${loan.unit}` : "";
      })
      .filter(Boolean);

    setTimeout(() => {
      setSubmitting(false);
      const result = returnLoans({
        logIds: lines.map((ln) => ln.logId),
        actualReturnDate: returnDate,
      });

      if (!result.ok) {
        setErrors((prev) => ({ ...prev, form: result.error ?? "บันทึกไม่สำเร็จ" }));
        return;
      }

      const base =
        summary.length > 1
          ? `${user.nickname} คืน ${summary.length} รายการ: ${summary.join(", ")}`
          : `${user.nickname} คืน ${summary[0]}`;
      setToast({
        title: "บันทึกการคืนสำเร็จ ✅",
        description: result.warning ? `${base} · ⚠️ ${result.warning}` : base,
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
          <UserInfoFields
            key={formKey}
            value={user}
            onChange={setUser}
            errors={errors}
          />
        </section>

        {/* ---- Loans to return (repeatable) ---- */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            รายการที่ต้องการคืน
          </h3>

          <div className="space-y-3">
            {lines.map((ln, idx) => {
              const loan = activeLoans.find((l) => l.id === ln.logId) ?? null;
              const loanErr = errors[`line-loan-${ln.key}`];
              const isOverdue =
                loan && resolveLogStatus(loan, today) === "Overdue";
              const taken = takenElsewhere(ln.key);
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

                  {/* Loan (left) + quantity (right, read-only) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem]">
                    {/* Loan selection */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`loan-${ln.key}`}>
                        รายการที่ยืมไว้ <span className="text-primary">*</span>
                      </Label>
                      <Select
                        id={`loan-${ln.key}`}
                        value={ln.logId}
                        onChange={(e) => {
                          updateLine(ln.key, { logId: e.target.value });
                          setErrors((prev) => ({
                            ...prev,
                            [`line-loan-${ln.key}`]: "",
                          }));
                        }}
                        aria-invalid={!!loanErr}
                      >
                        <option value="">— เลือกรายการที่ยืมไว้ —</option>
                        {activeLoans.map((l) => (
                          <option
                            key={l.id}
                            value={l.id}
                            disabled={taken.has(l.id)}
                          >
                            {l.itemName} · {l.borrowerName} · {l.quantity}{" "}
                            {l.unit} (ยืม {l.borrowDate})
                          </option>
                        ))}
                      </Select>
                      <FieldError message={loanErr} />
                    </div>

                    {/* Quantity being returned (fixed by the loan) */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`return-qty-${ln.key}`}>จำนวนที่คืน</Label>
                      <Input
                        id={`return-qty-${ln.key}`}
                        value={loan ? `${loan.quantity} ${loan.unit}` : "—"}
                        readOnly
                        tabIndex={-1}
                        className="cursor-default bg-muted/50 text-muted-foreground"
                      />
                    </div>
                  </div>

                  {/* Selected-loan detail */}
                  {loan && (
                    <div className="mt-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>
                          ยืมโดย{" "}
                          <span className="font-medium text-foreground">
                            {loan.borrowerName}
                          </span>{" "}
                          · {loan.year} · {loan.major}
                        </span>
                        {isOverdue && (
                          <Badge variant="danger">
                            <AlertTriangle className="h-3 w-3" />
                            เกินกำหนด
                          </Badge>
                        )}
                      </div>
                      {loan.expectedReturnDate && (
                        <div className="mt-1">
                          กำหนดคืน {loan.expectedReturnDate}
                        </div>
                      )}
                    </div>
                  )}
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

          {/* Actual return date (shared across the batch) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        {/* ---- Proof photo reminder (sent to the LINE OA, not this site) ---- */}
        <section className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">อย่าลืมส่งรูปสภาพของที่คืน</p>
            <p className="text-muted-foreground">
              หลังกดยืนยันการคืน กรุณา <strong>ถ่ายรูปสภาพของที่นำมาคืน แล้วส่งเข้า
              LINE OA ของชมรม</strong> เพื่อเป็นหลักฐาน (ระบบนี้ไม่เก็บรูป — ส่งทางไลน์เท่านั้น)
            </p>
          </div>
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
              "ยืนยันการคืน"
            )}
          </Button>
        </div>
      </form>

      <SuccessToast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
