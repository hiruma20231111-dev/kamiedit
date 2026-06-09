/**
 * アタック原稿（営業がクライアントに仮で見せる提案原稿）の媒体別フォーマット。
 * ※体裁は概算のv1。実物（各媒体の誌面）を見て今後寄せていく。
 */
import type { FieldDef, MediaId } from "@/lib/config/media";

export interface AttackSizeDef {
  size: string;
  label: string;
}

export interface AttackFormat {
  /** 選べるサイズ */
  sizes: AttackSizeDef[];
  /** 左の要項（入力項目） */
  fields: FieldDef[];
  /** DOMOぱど等の右フリー欄（AIで要項から生成） */
  hasFreeArea: boolean;
  freeLabel?: string;
  /** フリー欄のおおよその文字数（AI生成の目安） */
  freeMaxLength?: number;
  /** 仮写真の最大点数 */
  maxPhotos: number;
}

/** DOMOぱど（求人）の左要項 */
const recruitRequirements: FieldDef[] = [
  { key: "job_title", label: "職種", type: "text", maxLength: 30 },
  { key: "employment", label: "雇用形態", type: "text", maxLength: 20 },
  { key: "salary", label: "給与", type: "textarea", maxLength: 80 },
  { key: "work_hours", label: "勤務時間", type: "textarea", maxLength: 80 },
  { key: "work_place", label: "勤務地", type: "text", maxLength: 60 },
  { key: "holiday", label: "休日・休暇", type: "textarea", maxLength: 60 },
  { key: "qualification", label: "資格・歓迎", type: "textarea", maxLength: 80 },
  { key: "benefits", label: "待遇・福利厚生", type: "textarea", maxLength: 100 },
  { key: "how_to_apply", label: "応募方法", type: "textarea", maxLength: 80 },
  { key: "company", label: "企業名・問い合わせ", type: "text", maxLength: 60 },
];

/** まみたん／家庭版ぱど（販促）の項目 */
const promoFields: FieldDef[] = [
  { key: "catch", label: "キャッチコピー", type: "textarea", maxLength: 40, required: true },
  { key: "body", label: "本文・PR", type: "textarea", maxLength: 200 },
  { key: "store", label: "店名", type: "text", maxLength: 30 },
  { key: "address", label: "住所", type: "text", maxLength: 60 },
  { key: "tel", label: "電話番号", type: "text", maxLength: 20 },
  { key: "hours", label: "営業時間", type: "text", maxLength: 40 },
  { key: "holiday", label: "定休日", type: "text", maxLength: 30 },
  { key: "access", label: "アクセス", type: "text", maxLength: 40 },
  { key: "offer", label: "クーポン・特典", type: "textarea", maxLength: 60 },
];

export const ATTACK_FORMATS: Record<MediaId, AttackFormat> = {
  // DOMOぱど（求人）= 1/4・1/2。左要項→右フリーをAI生成
  shin_domo: {
    sizes: [
      { size: "1/4", label: "1/4" },
      { size: "1/2", label: "1/2" },
    ],
    fields: recruitRequirements,
    hasFreeArea: true,
    freeLabel: "フリーPR欄",
    freeMaxLength: 220,
    maxPhotos: 1,
  },
  // まみたん = 1P・1/2・1/4
  mamitan: {
    sizes: [
      { size: "1P", label: "1ページ" },
      { size: "1/2", label: "1/2" },
      { size: "1/4", label: "1/4" },
    ],
    fields: promoFields,
    hasFreeArea: false,
    maxPhotos: 3,
  },
  // 家庭版ぱど = 1P・1/2・1/4
  pado: {
    sizes: [
      { size: "1P", label: "1ページ" },
      { size: "1/2", label: "1/2" },
      { size: "1/4", label: "1/4" },
    ],
    fields: promoFields,
    hasFreeArea: false,
    maxPhotos: 3,
  },
};
