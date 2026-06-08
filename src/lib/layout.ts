/**
 * まみたん割付表のグリッド計算。
 * 1ページ = 2列 × 4行（=8セル, 1/8 が最小単位）。各枠は左上(col,row)に配置し、サイズで span。
 */
import type { LayoutSlot } from "@/lib/types";

export const COLS = 2;
export const ROWS = 4;

/** サイズが占めるユニット数（容量計算用） */
export const SIZE_UNITS: Record<string, number> = {
  "1/8": 1,
  "1/4": 2,
  "1/2": 4,
  "1P": 8,
  "2P": 8,
};

export function sizeUnits(size: string): number {
  return SIZE_UNITS[size] ?? 1;
}

/** サイズの占有スパン（列数・行数） */
export function sizeSpan(size: string): { col: number; row: number } {
  switch (size) {
    case "1/8":
      return { col: 1, row: 1 };
    case "1/4":
      return { col: 1, row: 2 };
    case "1/2":
      return { col: 2, row: 2 };
    case "1P":
      return { col: 2, row: 4 };
    case "2P":
      return { col: 2, row: 4 };
    default:
      return { col: 1, row: 1 };
  }
}

export interface Placed {
  slot: LayoutSlot;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

function cellKey(c: number, r: number) {
  return `${c},${r}`;
}

function fits(
  occupied: Set<string>,
  col: number,
  row: number,
  span: { col: number; row: number },
): boolean {
  if (col < 0 || row < 0) return false;
  if (col + span.col > COLS || row + span.row > ROWS) return false;
  for (let r = row; r < row + span.row; r++) {
    for (let c = col; c < col + span.col; c++) {
      if (occupied.has(cellKey(c, r))) return false;
    }
  }
  return true;
}

function markOccupied(
  occupied: Set<string>,
  col: number,
  row: number,
  span: { col: number; row: number },
) {
  for (let r = row; r < row + span.row; r++) {
    for (let c = col; c < col + span.col; c++) {
      occupied.add(cellKey(c, r));
    }
  }
}

/** 空きセルを左上から探す（無ければ null） */
export function findFreeCell(
  occupied: Set<string>,
  span: { col: number; row: number },
): { col: number; row: number } | null {
  for (let r = 0; r <= ROWS - span.row; r++) {
    for (let c = 0; c <= COLS - span.col; c++) {
      if (fits(occupied, c, r, span)) return { col: c, row: r };
    }
  }
  return null;
}

/**
 * ページ内スロットを配置解決する。
 * 明示 col/row を持つものを優先配置し、未設定/衝突するものは空きへ自動配置。
 */
export function resolvePlacement(pageSlots: LayoutSlot[]): Placed[] {
  const occupied = new Set<string>();
  const placed: Placed[] = [];
  const pending: LayoutSlot[] = [];

  // 1) 明示座標が有効なものを先に確定
  for (const slot of pageSlots) {
    const span = sizeSpan(slot.size);
    if (
      typeof slot.col === "number" &&
      typeof slot.row === "number" &&
      fits(occupied, slot.col, slot.row, span)
    ) {
      markOccupied(occupied, slot.col, slot.row, span);
      placed.push({
        slot,
        col: slot.col,
        row: slot.row,
        colSpan: span.col,
        rowSpan: span.row,
      });
    } else {
      pending.push(slot);
    }
  }

  // 2) 残りを空きへ自動配置
  for (const slot of pending) {
    const span = sizeSpan(slot.size);
    const free = findFreeCell(occupied, span);
    const pos = free ?? { col: 0, row: 0 };
    if (free) markOccupied(occupied, pos.col, pos.row, span);
    placed.push({
      slot,
      col: pos.col,
      row: pos.row,
      colSpan: span.col,
      rowSpan: span.row,
    });
  }

  return placed;
}

/** 指定スロットを除いた占有セル集合 */
export function occupancyExcluding(
  pageSlots: LayoutSlot[],
  excludeId: string,
): Set<string> {
  const occupied = new Set<string>();
  for (const p of resolvePlacement(pageSlots)) {
    if (p.slot.id === excludeId) continue;
    markOccupied(occupied, p.col, p.row, { col: p.colSpan, row: p.rowSpan });
  }
  return occupied;
}

export { fits };
