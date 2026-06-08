/**
 * 割付の受け渡し（書き出し/取り込み）用のパッケージ定義。
 * 各ユーザーのドライブにデータが分離しているため、割付を1ファイルに書き出して
 * 校正担当などへ渡し、相手のkamieditに取り込んで配置換えできるようにする。
 *
 * 画像はバイナリで書き出し元のドライブにあるため引き継がない（テキスト原稿と枠のみ）。
 */
import type { LayoutSlot, Manuscript } from "@/lib/types";

export const LAYOUT_PKG_KIND = "kamiedit-layout";
export const LAYOUT_PKG_VERSION = 1;

export interface LayoutPackage {
  kind: typeof LAYOUT_PKG_KIND;
  version: number;
  exportedAt: string;
  mediaId: string;
  issueName: string;
  pageCount: number | null;
  slots: LayoutSlot[];
  manuscripts: Manuscript[];
}

/** 受け渡しファイルとして妥当か */
export function isLayoutPackage(x: unknown): x is LayoutPackage {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    o.kind === LAYOUT_PKG_KIND &&
    typeof o.mediaId === "string" &&
    Array.isArray(o.slots) &&
    Array.isArray(o.manuscripts)
  );
}

/** ファイル名に使えない文字を除去 */
export function safeFileName(s: string | null | undefined): string {
  const t = (s ?? "").replace(/[\\/:*?"<>|\n\r]/g, "").trim();
  return t || "割付";
}
