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

/** Largest proof image we'll inline as a data URL (evidence is ephemeral). */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ProofRead {
  dataUrl?: string;
  error?: string;
}

/**
 * Read an image File into a data URL for in-memory preview only. There is no
 * server upload — the photo lives on the borrow log until the page reloads,
 * which is enough for an admin to eyeball the evidence and move on.
 */
export function readProofImage(file: File): Promise<ProofRead> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve({ error: "กรุณาเลือกไฟล์รูปภาพ" });
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      resolve({ error: "ไฟล์ใหญ่เกิน 5MB กรุณาเลือกรูปที่เล็กลง" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUrl: String(reader.result) });
    reader.onerror = () => resolve({ error: "อ่านไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง" });
    reader.readAsDataURL(file);
  });
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
