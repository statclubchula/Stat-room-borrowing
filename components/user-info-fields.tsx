"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FieldError } from "@/components/ui/field-error";
import { MAJOR_PRESETS, type UserInfo } from "@/lib/borrow-utils";

/** Sentinel select value for the "อื่น ๆ (โปรดระบุ)" free-form option. */
const OTHER_VALUE = "__other__";

export function UserInfoFields({
  value,
  onChange,
  errors,
}: {
  value: UserInfo;
  onChange: (next: UserInfo) => void;
  errors: Record<string, string>;
}) {
  const set = (patch: Partial<UserInfo>) => onChange({ ...value, ...patch });

  // "อื่น ๆ" mode — the major isn't one of the presets, so the user types a
  // custom faculty (บัญชี, บริหาร, …). Seeded from the incoming value so an
  // edit/prefill shows the text box, then tracked locally so that picking
  // "อื่น ๆ" and clearing the text keeps the box open. Parents remount this
  // component (via `key`) on reset, which resets this back to false.
  const [isOther, setIsOther] = React.useState(
    () => value.major !== "" && !MAJOR_PRESETS.includes(value.major)
  );

  const selectValue = isOther
    ? OTHER_VALUE
    : MAJOR_PRESETS.includes(value.major)
    ? value.major
    : "";

  function handleMajorSelect(next: string) {
    if (next === OTHER_VALUE) {
      setIsOther(true);
      set({ major: "" });
    } else {
      setIsOther(false);
      set({ major: next });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Nickname */}
      <div className="space-y-1.5">
        <Label htmlFor="nickname">
          ชื่อเล่น <span className="text-primary">*</span>
        </Label>
        <Input
          id="nickname"
          value={value.nickname}
          onChange={(e) => set({ nickname: e.target.value })}
          aria-invalid={!!errors.nickname}
        />
        <FieldError message={errors.nickname} />
      </div>

      {/* Year */}
      <div className="space-y-1.5">
        <Label htmlFor="year">
          ชั้นปี <span className="text-primary">*</span>
        </Label>
        <Input
          id="year"
          type="number"
          min={1}
          value={value.year}
          onChange={(e) => set({ year: e.target.value })}
          placeholder="ระบุชั้นปี (เช่น 1, 2, 3)"
          aria-invalid={!!errors.year}
        />
        <FieldError message={errors.year} />
      </div>

      {/* Major — preset dropdown with an "อื่น ๆ" free-form escape hatch */}
      <div className="space-y-1.5">
        <Label htmlFor="major">
          ภาค/สาขา <span className="text-primary">*</span>
        </Label>
        <Select
          id="major"
          value={selectValue}
          onChange={(e) => handleMajorSelect(e.target.value)}
          aria-invalid={!!errors.major}
        >
          <option value="">— เลือกภาค/สาขา —</option>
          {MAJOR_PRESETS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
          <option value={OTHER_VALUE}>อื่น ๆ (โปรดระบุ)</option>
        </Select>
        {isOther && (
          <Input
            id="major-other"
            value={value.major}
            onChange={(e) => set({ major: e.target.value })}
            placeholder="โปรดระบุภาค/สาขา (เช่น บัญชี, บริหาร)"
            aria-invalid={!!errors.major}
            className="duration-200 animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none"
          />
        )}
        <FieldError message={errors.major} />
      </div>

      {/* Contact */}
      <div className="space-y-1.5">
        <Label htmlFor="contact">
          ช่องทางติดต่อ <span className="text-primary">*</span>
        </Label>
        <Input
          id="contact"
          value={value.contact}
          onChange={(e) => set({ contact: e.target.value })}
          placeholder="เช่น ID LINE / IG / เบอร์โทร"
          aria-invalid={!!errors.contact}
        />
        <FieldError message={errors.contact} />
      </div>
    </div>
  );
}
