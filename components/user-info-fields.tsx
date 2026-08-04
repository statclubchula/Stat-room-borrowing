"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { type UserInfo } from "@/lib/borrow-utils";

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

      {/* Major */}
      <div className="space-y-1.5">
        <Label htmlFor="major">
          ภาค/สาขา <span className="text-primary">*</span>
        </Label>
        <Input
          id="major"
          value={value.major}
          onChange={(e) => set({ major: e.target.value })}
          aria-invalid={!!errors.major}
        />
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
          aria-invalid={!!errors.contact}
        />
        <FieldError message={errors.contact} />
      </div>
    </div>
  );
}
