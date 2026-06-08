/**
 * 媒体・サイズ・原稿フォーマットの定義。
 *
 * ⚠️ 文字数上限（maxLength）は暫定値です。
 *    参考資料（Y:\...\紙面資料＆フォーマット の媒体資料PDF / まみたんFO原稿用紙.xlsx）を基に
 *    「動的フォーム」実装フェーズで正式な数値に確定させます。
 */

export type MediaId = "mamitan" | "pado" | "shin_domo";

/** UIテーマカラー（globals.css / Tailwind 側のクラスにマッピングする想定） */
export type ThemeColor = "pink" | "blue" | "orange";

export interface FieldDef {
  /** content JSONB に保存するキー */
  key: string;
  /** 入力ラベル */
  label: string;
  /** input(1行) か textarea(複数行) か */
  type: "text" | "textarea";
  /** 文字数上限（暫定／要確定）。0 または未設定なら無制限 */
  maxLength?: number;
  /** 必須かどうか */
  required?: boolean;
  /** 画像枚数（写真フィールドの場合のみ） */
  imageCount?: number;
}

export interface SizeFormat {
  /** サイズ識別子（DB の size カラムに保存） */
  size: string;
  /** 表示ラベル */
  label: string;
  /** バリアント（まみたん 1/4 の 1店舗/2店舗 など）。なければ undefined */
  variants?: { id: string; label: string; fields: FieldDef[]; imageCount: number }[];
  /** バリアントが無い場合の入力フィールド */
  fields?: FieldDef[];
  /** 画像点数（バリアントが無い場合） */
  imageCount?: number;
}

export interface MediaConfig {
  id: MediaId;
  name: string;
  theme: ThemeColor;
  /** 割付表（グリッドUI）を持つか。まみたん=true、ぱど/新DOMO=false */
  hasLayout: boolean;
  /** まみたんの割付で選べるページ構成 */
  pageOptions?: number[];
  sizes: SizeFormat[];
}

/** 共通フィールド（多くのサイズで使う基本項目） */
const storeInfoFields: FieldDef[] = [
  { key: "store_name", label: "店舗名・掲載名", type: "text", maxLength: 40, required: true },
  { key: "catch_copy", label: "キャッチコピー", type: "text", maxLength: 30 },
  { key: "body", label: "本文・PR文", type: "textarea", maxLength: 120 },
  { key: "tel", label: "電話番号", type: "text", maxLength: 20 },
  { key: "address", label: "住所", type: "text", maxLength: 60 },
  { key: "hours", label: "営業時間・定休日", type: "text", maxLength: 60 },
];

/** 新DOMO!ぱど（求人特化）の項目 */
const recruitFields: FieldDef[] = [
  { key: "catch_copy", label: "キャッチコピー", type: "text", maxLength: 30, required: true },
  { key: "job_content", label: "職種・仕事内容", type: "textarea", maxLength: 120, required: true },
  { key: "salary", label: "給与", type: "text", maxLength: 60 },
  { key: "work_hours", label: "勤務時間・休日", type: "textarea", maxLength: 80 },
  { key: "qualification", label: "資格", type: "text", maxLength: 60 },
  { key: "benefits", label: "待遇", type: "textarea", maxLength: 80 },
  { key: "work_place", label: "勤務地", type: "text", maxLength: 60 },
  { key: "how_to_apply", label: "応募方法", type: "textarea", maxLength: 80 },
  { key: "company_info", label: "企業情報", type: "textarea", maxLength: 100 },
];

export const MEDIA: Record<MediaId, MediaConfig> = {
  mamitan: {
    id: "mamitan",
    name: "まみたん",
    theme: "pink",
    hasLayout: true,
    pageOptions: [16, 24, 32, 40],
    sizes: [
      { size: "1/8", label: "1/8", fields: storeInfoFields, imageCount: 1 },
      {
        size: "1/4",
        label: "1/4",
        variants: [
          {
            id: "1store",
            label: "1店舗用（写真3点＋店舗情報1件）",
            fields: storeInfoFields,
            imageCount: 3,
          },
          {
            id: "2store",
            label: "2店舗用（写真なし＋店舗情報2件）",
            // 2店舗ぶんの情報を入力（_2 サフィックスで2件目を保持）
            fields: [
              ...storeInfoFields,
              ...storeInfoFields.map((f) => ({ ...f, key: `${f.key}_2`, label: `${f.label}（2店舗目）` })),
            ],
            imageCount: 0,
          },
        ],
      },
      { size: "1/2", label: "1/2", fields: storeInfoFields, imageCount: 4 },
      { size: "1P", label: "1ページ", fields: storeInfoFields, imageCount: 6 },
      { size: "2P", label: "2ページ", fields: storeInfoFields, imageCount: 10 },
    ],
  },

  pado: {
    id: "pado",
    name: "ぱど",
    theme: "blue",
    hasLayout: false,
    sizes: [
      { size: "1/8", label: "1/8", fields: storeInfoFields, imageCount: 1 },
      { size: "1/4", label: "1/4", fields: storeInfoFields, imageCount: 2 },
      { size: "1/2", label: "1/2", fields: storeInfoFields, imageCount: 4 },
      { size: "1P", label: "1ページ", fields: storeInfoFields, imageCount: 6 },
      { size: "2P", label: "2ページ", fields: storeInfoFields, imageCount: 10 },
    ],
  },

  shin_domo: {
    id: "shin_domo",
    name: "新DOMO!ぱど",
    theme: "orange",
    hasLayout: false,
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

/** AIアシスト用のパラメータ選択肢 */
export const GENRE_OPTIONS = ["医療", "飲食店", "スクール", "美容", "小売", "サービス", "不動産", "その他"];
export const TONE_OPTIONS = ["カジュアル", "ミドル", "フォーマル"];
export const TARGET_OPTIONS = ["主婦層", "ファミリー", "学生", "シニア", "若年層", "全般"];
