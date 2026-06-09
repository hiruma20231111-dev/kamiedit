/**
 * アタック原稿（営業がクライアントに仮で見せる提案原稿）の媒体別フォーマット。
 * ※体裁は概算のv1。実物（各媒体の誌面）を見て今後寄せていく。
 */
import type { FieldDef, FieldOption, MediaId } from "@/lib/config/media";

export interface AttackSizeDef {
  size: string;
  label: string;
}

/** ❶就業形態マーク（発行元「求人広告の見方」準拠） */
export const EMPLOYMENT_OPTIONS: FieldOption[] = [
  { value: "arbeit", label: "アルバイト", mark: "ア" },
  { value: "part", label: "パート", mark: "パ" },
  { value: "haken", label: "登録型派遣", mark: "派" },
  { value: "shoukai", label: "紹介予定派遣", mark: "予" },
  { value: "yuryo", label: "有料職業紹介", mark: "紹" },
  { value: "naishoku", label: "内職", mark: "内" },
  { value: "seishain", label: "正社員", mark: "正" },
  { value: "keiyaku", label: "契約社員・準社員", mark: "契" },
  { value: "itaku", label: "業務委託・嘱託", mark: "委" },
];

/** ❸PRマーク（誌面下部凡例＋見方ページ準拠） */
export const PR_MARK_OPTIONS: FieldOption[] = [
  { value: "opening", label: "オープニングスタッフ", mark: "OPN" },
  { value: "first", label: "初登場・ひさびさ登場", mark: "初" },
  { value: "tanpatsu", label: "1日短期・単発", mark: "単" },
  { value: "tanki", label: "短期", mark: "短" },
  { value: "week3", label: "週3日以内", mark: "週3" },
  { value: "hour4", label: "4時間以内", mark: "4h" },
  { value: "shift", label: "シフト自己申告制", mark: "シ" },
  { value: "weekend", label: "土日祝のみ", mark: "土日" },
  { value: "shinya", label: "深夜", mark: "深" },
  { value: "souchou", label: "早朝", mark: "早" },
  { value: "hibarai", label: "日払い可", mark: "日払" },
  { value: "shuubarai", label: "週払い可", mark: "週払" },
  { value: "koukou", label: "高校生歓迎", mark: "高" },
  { value: "gakusei", label: "学生歓迎", mark: "学" },
  { value: "freeter", label: "フリーター歓迎", mark: "フ" },
  { value: "shufu", label: "主婦・主夫歓迎", mark: "主" },
  { value: "shinsotsu", label: "新卒・第二新卒歓迎", mark: "新" },
  { value: "mikeiken", label: "未経験者歓迎", mark: "未" },
  { value: "keikensha", label: "経験者優遇", mark: "経" },
  { value: "kuruma", label: "車通勤可", mark: "車" },
  { value: "koutsuhi", label: "交通費支給", mark: "交" },
  { value: "makanai", label: "まかない・食事補助", mark: "食" },
  { value: "ryou", label: "寮・社宅あり", mark: "寮" },
  { value: "tenkin", label: "転勤なし", mark: "転無" },
  { value: "touyou", label: "正社員登用あり", mark: "正用" },
];

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

/**
 * DOMOぱど（求人）アタック原稿のフィールド。発行元「求人広告の見方」の
 * 5アンカー（❶就業形態 ❷交通アクセス ❸PRマーク ❹募集内容 ❺QR）に準拠。
 */
const domoFields: FieldDef[] = [
  // ❶就業形態 / ❷交通アクセス / ❸PRマーク / ❺QR（ヘッダー帯）
  { key: "employment", label: "就業形態（❶）", type: "select", options: EMPLOYMENT_OPTIONS, required: true },
  { key: "area", label: "交通アクセス（❷ 最寄り駅・目印→勤務地）", type: "text", maxLength: 40, hint: "例: 鴻池新田駅 徒歩5分" },
  { key: "pr_marks", label: "PRマーク（❸）", type: "badges", options: PR_MARK_OPTIONS },
  { key: "qr", label: "QRコード（❺ サクッと簡単応募）", type: "qr" },
  // 職種・見出し / 給与帯
  { key: "job_title", label: "職種・見出し", type: "text", maxLength: 30, required: true },
  { key: "salary", label: "給与（時給/月給 等の帯）", type: "text", maxLength: 40, required: true },
  // ❹募集内容（赤■の箇条書き）
  { key: "job_content", label: "仕事内容", type: "textarea", maxLength: 120 },
  { key: "work_hours", label: "勤務時間", type: "textarea", maxLength: 80 },
  { key: "holiday", label: "休日・休暇", type: "textarea", maxLength: 60 },
  { key: "qualification", label: "資格・歓迎", type: "textarea", maxLength: 60 },
  { key: "treatment", label: "待遇・福利厚生", type: "textarea", maxLength: 100, hint: "交通費・制服貸与・食事補助・車通勤可 等" },
  { key: "how_to_apply", label: "応募方法", type: "textarea", maxLength: 60 },
  // 【職場情報】
  { key: "workplace_type", label: "職場情報（業種）", type: "text", maxLength: 30, hint: "例: イタリアンレストラン" },
  { key: "senpai", label: "先輩から・職場PR", type: "textarea", maxLength: 140 },
  // 連絡先・会社名
  { key: "address", label: "住所（〒）", type: "text", maxLength: 60 },
  { key: "tel", label: "電話番号", type: "text", maxLength: 24 },
  { key: "contact_person", label: "担当者", type: "text", maxLength: 20 },
  { key: "company", label: "会社名・店名", type: "text", maxLength: 40, required: true },
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
  // DOMOぱど（求人）= 1/4(縦・単一カラム)・1/2(二段)。実誌面の求人広告体裁に準拠。
  shin_domo: {
    sizes: [
      { size: "1/4", label: "1/4（縦・小枠）" },
      { size: "1/2", label: "1/2" },
    ],
    fields: domoFields,
    hasFreeArea: true,
    freeLabel: "キャッチコピー（赤・中央）",
    freeMaxLength: 60,
    maxPhotos: 2,
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
