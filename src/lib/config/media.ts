/**
 * 媒体・サイズ・原稿フォーマットの定義。
 *
 * まみたん: 「まみたんFO原稿用紙.xlsx」から正確な項目・文字数を反映済み。
 * ぱど / 新DOMO!ぱど: 原稿用紙テンプレが未入手のため項目は仕様書ベース、
 *   文字数(maxLength)は暫定値（要確定）。media-data PDF 入手後に更新する。
 */

import type { ManuscriptKind, ManuscriptCategory } from "@/lib/types";

export type MediaId = "mamitan" | "pado" | "shin_domo";
export type ThemeColor = "pink" | "blue" | "orange";

/** 原稿種類の選択肢・表示名（枠作成時に使う構造的な区分） */
export const KIND_OPTIONS: ManuscriptKind[] = ["ad", "inhouse", "lead", "cover"];
export const KIND_LABELS: Record<ManuscriptKind, string> = {
  ad: "広告",
  inhouse: "自社稿",
  lead: "巻頭記事",
  cover: "表紙",
};

/** 企画区分の選択肢・表示名（原稿編集時に使う企画カテゴリ） */
export const CATEGORY_OPTIONS: ManuscriptCategory[] = [
  "format",
  "free",
  "school",
  "money_seminar",
  "other",
];
export const CATEGORY_LABELS: Record<ManuscriptCategory, string> = {
  format: "フォーマット",
  free: "フリー",
  school: "スクール",
  money_seminar: "マネセミ",
  other: "その他企画",
};

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea";
  /** 文字数上限。未設定なら無制限 */
  maxLength?: number;
  required?: boolean;
  /** 入力補助の注記 */
  hint?: string;
}

export interface SizeVariant {
  id: string;
  label: string;
  fields: FieldDef[];
  imageCount: number;
}

export interface SizeFormat {
  size: string;
  label: string;
  variants?: SizeVariant[];
  fields?: FieldDef[];
  imageCount?: number;
}

export interface MediaConfig {
  id: MediaId;
  name: string;
  theme: ThemeColor;
  hasLayout: boolean;
  /** TOPカードの表紙イメージ画像パス（public配下）。無ければグラデーション表示 */
  cover?: string;
  pageOptions?: number[];
  sizes: SizeFormat[];
}

/** 店舗情報（1店舗ぶん）。suffix で複数店舗を区別 */
function storeFields(suffix = "", lbl = ""): FieldDef[] {
  return [
    { key: `store_name${suffix}`, label: `店名${lbl}`, type: "text", maxLength: 30 },
    { key: `tel${suffix}`, label: `電話番号${lbl}`, type: "text", maxLength: 20 },
    { key: `address${suffix}`, label: `住所${lbl}`, type: "text", maxLength: 60 },
    { key: `hours${suffix}`, label: `営業時間${lbl}`, type: "text", maxLength: 40 },
    { key: `holiday${suffix}`, label: `定休日${lbl}`, type: "text", maxLength: 30 },
    { key: `other${suffix}`, label: `その他${lbl}`, type: "text", maxLength: 40 },
  ];
}

const genre: FieldDef = { key: "genre", label: "業種", type: "text", maxLength: 8, hint: "8文字程度" };

/** ぱど用 汎用フィールド（暫定） */
const padoFields: FieldDef[] = [
  genre,
  { key: "catch", label: "キャッチコピー", type: "textarea", maxLength: 30, required: true },
  { key: "body", label: "本文・PR文", type: "textarea", maxLength: 120 },
  ...storeFields(),
  { key: "coupon", label: "クーポン／インフォメーション", type: "textarea", maxLength: 60 },
];

/** 新DOMO!ぱど（求人特化）の項目（文字数は暫定） */
const recruitFields: FieldDef[] = [
  { key: "catch", label: "キャッチコピー", type: "textarea", maxLength: 30, required: true },
  { key: "job_content", label: "職種・仕事内容", type: "textarea", maxLength: 120, required: true },
  { key: "salary", label: "給与", type: "text", maxLength: 60 },
  { key: "work_hours", label: "勤務時間・休日", type: "textarea", maxLength: 80 },
  { key: "qualification", label: "資格", type: "text", maxLength: 60 },
  { key: "benefits", label: "待遇", type: "textarea", maxLength: 80 },
  { key: "work_place", label: "勤務地", type: "text", maxLength: 60 },
  { key: "how_to_apply", label: "応募方法", type: "textarea", maxLength: 80 },
  { key: "company_info", label: "企業情報", type: "textarea", maxLength: 100 },
];

/** まみたん 1/4 の原稿バリエーション（縦長1/4・横長1/4Y で共用） */
const quarterVariants: SizeVariant[] = [
  {
    id: "1store",
    label: "1店舗（写真3点）",
    imageCount: 3,
    fields: [
      genre,
      { key: "catch", label: "キャッチ", type: "textarea", maxLength: 40, required: true, hint: "10文字×4行＝40文字まで" },
      { key: "body", label: "本文", type: "textarea", maxLength: 126, hint: "126文字まで" },
      { key: "appeal", label: "アピールポイント", type: "text", maxLength: 40 },
      ...storeFields(),
    ],
  },
  {
    id: "2store",
    label: "2店舗（写真不可）",
    imageCount: 0,
    fields: [
      genre,
      { key: "catch", label: "キャッチ", type: "textarea", maxLength: 40, required: true, hint: "10文字×4行" },
      { key: "body", label: "本文", type: "textarea", maxLength: 220, hint: "17文字×13行＝220文字まで" },
      ...storeFields("_1", "（1店舗目）"),
      ...storeFields("_2", "（2店舗目）"),
    ],
  },
];

/** まみたん 1/2 の原稿バリエーション（2×2の1/2・縦長1/2T で共用） */
const halfVariants: SizeVariant[] = [
  {
    id: "1store",
    label: "1店舗（写真フリー）",
    imageCount: 8,
    fields: [
      genre,
      { key: "catch", label: "キャッチ", type: "textarea", maxLength: 40, required: true, hint: "10文字×4行＝40文字まで" },
      { key: "body", label: "本文", type: "textarea", maxLength: 220 },
      { key: "caption", label: "メイン写真キャプション", type: "textarea", maxLength: 90, hint: "45文字×2行＝90文字程度" },
      ...storeFields(),
    ],
  },
  {
    id: "2store",
    label: "2店舗（写真2点まで）",
    imageCount: 2,
    fields: [
      genre,
      { key: "catch", label: "キャッチ", type: "textarea", maxLength: 40, required: true },
      { key: "body", label: "本文", type: "textarea", maxLength: 220 },
      ...storeFields("_1", "①"),
      ...storeFields("_2", "②"),
    ],
  },
  {
    id: "3store",
    label: "3店舗（写真1点まで）",
    imageCount: 1,
    fields: [
      genre,
      { key: "catch", label: "キャッチ", type: "textarea", maxLength: 40, required: true },
      ...storeFields("_1", "①"),
      ...storeFields("_2", "②"),
      ...storeFields("_3", "③"),
    ],
  },
];

export const MEDIA: Record<MediaId, MediaConfig> = {
  // ───────── まみたん（原稿用紙Excelより正確） ─────────
  mamitan: {
    id: "mamitan",
    name: "まみたん",
    theme: "pink",
    hasLayout: true,
    cover: "/covers/mamitan.jpg",
    pageOptions: [16, 24, 32, 40],
    sizes: [
      {
        size: "1/8",
        label: "1/8",
        imageCount: 1,
        fields: [
          genre,
          { key: "catch", label: "キャッチ", type: "textarea", maxLength: 20, required: true, hint: "10文字×2行＝20文字まで" },
          { key: "body", label: "本文", type: "textarea", maxLength: 120, hint: "120文字以内" },
          { key: "coupon", label: "クーポン／インフォメーション", type: "textarea", maxLength: 60 },
          ...storeFields(),
        ],
      },
      { size: "1/4", label: "1/4（縦）", variants: quarterVariants },
      { size: "1/4Y", label: "1/4Y（横2枠）", variants: quarterVariants },
      { size: "1/2", label: "1/2（2×2）", variants: halfVariants },
      { size: "1/2T", label: "1/2T（縦4枠）", variants: halfVariants },
      // 2/3（6マス＝2列×3行）。主に自社稿で使用
      {
        size: "2/3",
        label: "2/3（6マス）",
        imageCount: 8,
        fields: [
          genre,
          { key: "catch", label: "キャッチ", type: "textarea", maxLength: 40 },
          { key: "body", label: "本文", type: "textarea", maxLength: 400 },
          { key: "caption", label: "メイン写真キャプション", type: "textarea", maxLength: 90 },
          ...storeFields(),
        ],
      },
      // 割付上のフルページ枠（原稿項目は暫定）
      { size: "1P", label: "1ページ", imageCount: 8, fields: [genre, { key: "catch", label: "キャッチ", type: "textarea", maxLength: 40 }, { key: "body", label: "本文", type: "textarea", maxLength: 300 }, ...storeFields()] },
      { size: "2P", label: "2ページ(見開き)", imageCount: 12, fields: [genre, { key: "catch", label: "キャッチ", type: "textarea", maxLength: 60 }, { key: "body", label: "本文", type: "textarea", maxLength: 600 }, ...storeFields()] },
    ],
  },

  // ───────── ぱど（暫定） ─────────
  pado: {
    id: "pado",
    name: "ぱど",
    theme: "blue",
    hasLayout: false,
    cover: "/covers/pado.jpg",
    sizes: [
      { size: "1/8", label: "1/8", fields: padoFields, imageCount: 1 },
      { size: "1/4", label: "1/4", fields: padoFields, imageCount: 2 },
      { size: "1/2", label: "1/2", fields: padoFields, imageCount: 4 },
      { size: "1P", label: "1ページ", fields: padoFields, imageCount: 6 },
      { size: "2P", label: "2ページ", fields: padoFields, imageCount: 10 },
    ],
  },

  // ───────── 新DOMO!ぱど（求人特化・暫定） ─────────
  shin_domo: {
    id: "shin_domo",
    name: "新DOMO!ぱど",
    theme: "orange",
    hasLayout: false,
    cover: "/covers/shin_domo.jpg",
    sizes: [
      { size: "1/16P", label: "1/16P", fields: recruitFields, imageCount: 1 },
      { size: "1/8P", label: "1/8P", fields: recruitFields, imageCount: 1 },
      { size: "1/4P", label: "1/4P", fields: recruitFields, imageCount: 2 },
      { size: "1/2P", label: "1/2P", fields: recruitFields, imageCount: 3 },
      { size: "1P", label: "1ページ", fields: recruitFields, imageCount: 4 },
      { size: "2P", label: "2ページ", fields: recruitFields, imageCount: 6 },
    ],
  },
};

export const MEDIA_LIST: MediaConfig[] = Object.values(MEDIA);

/** サイズ定義を取得（variant 指定時はそのフィールド/画像数を解決） */
export function resolveFormat(
  media: MediaConfig,
  size: string,
  variantId?: string | null,
): { fields: FieldDef[]; imageCount: number; variants?: SizeVariant[] } | null {
  const sf = media.sizes.find((s) => s.size === size);
  if (!sf) return null;
  if (sf.variants && sf.variants.length > 0) {
    const v =
      sf.variants.find((x) => x.id === variantId) ?? sf.variants[0];
    return { fields: v.fields, imageCount: v.imageCount, variants: sf.variants };
  }
  return { fields: sf.fields ?? [], imageCount: sf.imageCount ?? 0 };
}

/** AIアシスト用のパラメータ選択肢 */
export const GENRE_OPTIONS = ["医療", "飲食店", "スクール", "美容", "小売", "サービス", "不動産", "その他"];
export const TONE_OPTIONS = ["カジュアル", "ミドル", "フォーマル"];
export const TARGET_OPTIONS = ["主婦層", "ファミリー", "学生", "シニア", "若年層", "全般"];
