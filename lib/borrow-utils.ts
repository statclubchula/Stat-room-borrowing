/**
 * lib/borrow-utils.ts
 * Shared types & helpers for the Borrow / Return forms.
 */

/** Shared "who is borrowing/returning" fields. */
export interface UserInfo {
  /** Nickname — ชื่อเล่น */
  nickname: string;
  /** Year of study — ชั้นปี */
  year: string;
  /** Major / department — ภาค/สาขา */
  major: string;
  /** Contact info (phone / line / email) — ช่องทางติดต่อ */
  contact: string;
}

export const EMPTY_USER_INFO: UserInfo = {
  nickname: "",
  year: "",
  major: "",
  contact: "",
};

/** Today's date as `yyyy-mm-dd` for `<input type="date">` defaults. */
export function todayISO(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

/** Validate the shared user-info block. Returns field->message errors. */
export function validateUserInfo(info: UserInfo): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!info.nickname.trim()) errors.nickname = "กรุณากรอกชื่อเล่น";
  if (!info.year.trim()) errors.year = "กรุณาระบุชั้นปี";
  if (!info.major.trim()) errors.major = "กรุณากรอกภาค/สาขา";
  if (!info.contact.trim()) errors.contact = "กรุณากรอกช่องทางติดต่อ";
  return errors;
}
