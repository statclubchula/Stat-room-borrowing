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

/**
 * Preset options for the "ภาค/สาขา" dropdown (the stat-club sections). Anything
 * outside this list is entered free-form via the "อื่น ๆ (โปรดระบุ)" choice, so
 * `major` on {@link UserInfo} stays a plain string either way.
 */
export const MAJOR_PRESETS: string[] = ["Stat", "Ins", "Bit"];

/** Today's date as `yyyy-mm-dd` for `<input type="date">` defaults. */
export function todayISO(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

/** Largest source image we'll accept before downscaling. */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Longest side (px) a proof photo is downscaled to before it's stored. The
 * store now persists to localStorage, so a raw multi-MB data URL would blow the
 * ~5MB quota after a photo or two; shrinking keeps many photos well within it.
 */
export const PROOF_MAX_DIMENSION = 1280;

/** JPEG quality used when re-encoding the downscaled proof photo. */
export const PROOF_JPEG_QUALITY = 0.7;

export interface ProofRead {
  dataUrl?: string;
  error?: string;
}

/** Read a File into a data URL (browser only; used before re-encoding). */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** Decode a data URL into an <img> so we can draw it onto a canvas. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = src;
  });
}

/**
 * Downscale (longest side ≤ {@link PROOF_MAX_DIMENSION}) and JPEG-recompress a
 * data URL so it's small enough to persist. Falls back to the original string
 * if the canvas API is unavailable.
 */
async function compressDataUrl(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const longest = Math.max(img.width, img.height) || 1;
  const scale = Math.min(1, PROOF_MAX_DIMENSION / longest);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // no 2D context — keep the original
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", PROOF_JPEG_QUALITY);
}

/**
 * Read an image File into a compact data URL for the borrow/return log. The
 * photo is downscaled and re-encoded first so a few evidence shots don't
 * overflow the localStorage quota (which would silently drop the whole save).
 * There is still no server upload — swap this for real storage with the backend.
 */
export async function readProofImage(file: File): Promise<ProofRead> {
  if (!file.type.startsWith("image/")) {
    return { error: "กรุณาเลือกไฟล์รูปภาพ" };
  }
  if (file.size > MAX_PROOF_BYTES) {
    return { error: "ไฟล์ใหญ่เกิน 5MB กรุณาเลือกรูปที่เล็กลง" };
  }
  try {
    const raw = await readFileAsDataUrl(file);
    try {
      const compressed = await compressDataUrl(raw);
      // Tiny images can grow when re-encoded — keep whichever is smaller.
      return { dataUrl: compressed.length < raw.length ? compressed : raw };
    } catch {
      return { dataUrl: raw }; // compression unsupported — store as-is
    }
  } catch {
    return { error: "อ่านไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
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
