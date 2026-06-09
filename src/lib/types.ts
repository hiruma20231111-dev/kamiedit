/**
 * DB テーブルに対応する TypeScript 型。
 * Supabase プロジェクト接続後は `supabase gen types` での自動生成に置き換え可能。
 */

export type Role = "admin" | "editor";
export type ManuscriptStatus = "draft" | "done";
export type SourceType = "new" | "reuse" | "edit" | "supplied";
/** 原稿種類: 広告 / 自社稿 / 巻頭記事 / 表紙（枠の構造的な区分。枠作成時に指定） */
export type ManuscriptKind = "ad" | "inhouse" | "lead" | "cover";
/** 企画区分: 原稿編集時に選ぶ企画カテゴリ */
export type ManuscriptCategory =
  | "format"
  | "free"
  | "school"
  | "money_seminar"
  | "other";

export interface Media {
  id: string;
  name: string;
  theme_color: "pink" | "blue" | "orange";
  has_layout: boolean;
  sort_order: number;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
}

export interface Issue {
  id: string;
  media_id: string;
  name: string;
  year: number | null;
  month: number | null;
  page_count: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Manuscript {
  id: string;
  issue_id: string;
  media_id: string;
  size: string;
  variant: string | null;
  kind?: ManuscriptKind;
  /** 企画区分（フォーマット/フリー/スクール/マネセミ/その他企画） */
  category?: ManuscriptCategory | null;
  company_name: string | null;
  display_name: string | null;
  genre: string | null;
  tone: string | null;
  target: string | null;
  content: Record<string, unknown>;
  remarks: string | null;
  status: ManuscriptStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LayoutSlot {
  id: string;
  issue_id: string;
  page_no: number;
  position: number;
  /** ページ内グリッドの配置（左上セル）。0始まり。未設定なら順序で自動配置 */
  col?: number;
  row?: number;
  size: string;
  kind?: ManuscriptKind;
  company_name: string | null;
  display_name: string | null;
  manuscript_id: string | null;
  source_type: SourceType | null;
  created_at: string;
  updated_at: string;
}

export interface ManuscriptImage {
  id: string;
  manuscript_id: string;
  storage_path: string;
  original_name: string | null;
  role: string | null;
  sort_order: number;
  created_at: string;
}

/**
 * アタック原稿（営業がクライアントに見せる仮提案原稿）。
 * 号には紐づかない媒体ごとの単独データ。写真は縮小したdataURLをそのまま保持。
 */
export interface AttackManuscript {
  id: string;
  media_id: string;
  size: string;
  title: string | null;
  /** 左の要項/各項目の値（key=フィールドkey） */
  content: Record<string, string>;
  /** DOMOぱど等の右フリー欄テキスト（AI生成・手編集可） */
  free_text: string | null;
  /** 仮写真（縮小済みdataURL） */
  photos: string[];
  created_at: string;
  updated_at: string;
}
