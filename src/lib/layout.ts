/**
 * まみたん割付表のグリッド計算。
 * 1ページ = 8 ユニット（1/8 が最小単位）。グリッドは 2列 × 4行。
 */

/** サイズが占めるユニット数（容量計算用） */
export const SIZE_UNITS: Record<string, number> = {
  "1/8": 1,
  "1/4": 2,
  "1/2": 4,
  "1P": 8,
  "2P": 8, // 見開き。容量上は1ページ=8として扱う（2ページ目に続く想定）
};

/** グリッドでの占有セル（col/row span のTailwindクラス。静的文字列でTailwindが検出可能） */
export function spanClass(size: string): string {
  switch (size) {
    case "1/8":
      return "col-span-1 row-span-1";
    case "1/4":
      return "col-span-1 row-span-2";
    case "1/2":
      return "col-span-2 row-span-2";
    case "1P":
      return "col-span-2 row-span-4";
    case "2P":
      return "col-span-2 row-span-4";
    default:
      return "col-span-1 row-span-1";
  }
}

export function sizeUnits(size: string): number {
  return SIZE_UNITS[size] ?? 1;
}
