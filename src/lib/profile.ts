/**
 * ユーザー個人設定（ブラウザ localStorage 管理）。
 * Gemini API キーはサーバーに送らず、各自のブラウザにのみ保存する。
 */
const GEMINI_KEY = "kamiedit.gemini_api_key";

export function getGeminiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(GEMINI_KEY) ?? "";
}

export function setGeminiKey(value: string): void {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(GEMINI_KEY, value);
  else window.localStorage.removeItem(GEMINI_KEY);
}

export function hasGeminiKey(): boolean {
  return !!getGeminiKey();
}
