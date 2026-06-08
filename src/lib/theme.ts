import type { ThemeColor } from "@/lib/config/media";

/** 媒体テーマカラーごとの Tailwind クラス（ライト/ダーク両対応） */
export interface ThemeStyle {
  /** カードのグラデーション帯 */
  gradient: string;
  /** アクセント文字色 */
  text: string;
  /** 枠線 */
  border: string;
  /** 淡い背景 */
  softBg: string;
  /** ボタン等の塗り */
  solid: string;
  /** ホバー時の枠線/影 */
  ring: string;
  label: string;
}

export const THEME_STYLES: Record<ThemeColor, ThemeStyle> = {
  pink: {
    gradient: "from-pink-500 to-rose-400",
    text: "text-pink-600 dark:text-pink-400",
    border: "border-pink-200 dark:border-pink-900/50",
    softBg: "bg-pink-50 dark:bg-pink-950/30",
    solid: "bg-pink-600 hover:bg-pink-700 text-white",
    ring: "hover:ring-pink-400/60",
    label: "ピンク",
  },
  blue: {
    gradient: "from-sky-500 to-blue-400",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-900/50",
    softBg: "bg-sky-50 dark:bg-sky-950/30",
    solid: "bg-sky-600 hover:bg-sky-700 text-white",
    ring: "hover:ring-sky-400/60",
    label: "ブルー",
  },
  orange: {
    gradient: "from-orange-500 to-amber-400",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-900/50",
    softBg: "bg-orange-50 dark:bg-orange-950/30",
    solid: "bg-orange-600 hover:bg-orange-700 text-white",
    ring: "hover:ring-orange-400/60",
    label: "オレンジ",
  },
};
