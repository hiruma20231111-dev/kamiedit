/**
 * 受注インボックス（kamiedit がアプリ自身で作成する共有スプレッドシート）の
 * 列スキーマとパース。営業の「受注情報」シート実項目に合わせ、割付ルーティング用に
 * エリア版・発行年/月を加えた構成。Googleフォーム送信時に Apps Script が
 * この列順でアプリのシートへ1行追記する（方式A）。
 */
import { MAMITAN_AREAS } from "@/lib/config/media";

/** 受注シートのヘッダー（アプリが作成。Apps Scriptもこの順で追記する） */
export const ORDER_HEADERS = [
  "タイムスタンプ",
  "エリア版",
  "発行年",
  "発行月",
  "クライアント名",
  "広告名",
  "掲載名",
  "営業",
  "企画",
  "サイズ",
  "金額",
  "定価",
  "先請求",
  "回収方法",
  "原本",
  "新規",
  "備考",
  "状態",
  "取込メモ",
] as const;

/** 状態列=R / 取込メモ列=S（ヘッダー19列・1始まり） */
export const ORDER_STATUS_COL = "R";
export const ORDER_NOTE_COL = "S";
export const ORDER_RANGE = "A1:S2000";
export const ORDER_STATUS_TAKEN = "取込済";

/** 割付（まみたん）のサイズ一覧 */
const LAYOUT_SIZES = ["1/8", "1/4", "1/4Y", "1/2", "1/2T", "2/3", "1P", "2P"];

/**
 * 申込書のサイズ表記（1 / 2 / 1/2 / 1/4 / 1/8 / 1/2p 等）を割付の枠サイズへ。
 * 「1」=1ページ=1P、「2」=見開き=2P。未知は 1/8 にフォールバック。
 */
export function mapOrderSize(raw: string): string {
  const t = (raw ?? "").trim();
  if (!t) return "1/8";
  if (t === "1") return "1P";
  if (t === "2") return "2P";
  if (LAYOUT_SIZES.includes(t)) return t;
  const noP = t.replace(/[pP]$/, ""); // "1/2p" → "1/2"
  if (LAYOUT_SIZES.includes(noP)) return noP;
  if (noP === "1") return "1P";
  if (noP === "2") return "2P";
  return "1/8";
}

/** サイズ表記が割付サイズへ正しく解決できるか（未知なら警告表示用） */
export function isKnownSize(raw: string): boolean {
  const t = (raw ?? "").trim();
  if (!t) return false;
  if (["1", "2"].includes(t)) return true;
  if (LAYOUT_SIZES.includes(t)) return true;
  return LAYOUT_SIZES.includes(t.replace(/[pP]$/, ""));
}

export interface OrderRow {
  /** シート上の1始まり行番号（ヘッダーが1行目） */
  rowIndex: number;
  timestamp: string;
  areaNames: string[];
  areaIds: string[];
  unknownAreas: string[];
  year: number | null;
  month: number | null;
  client: string;
  adName: string;
  displayName: string;
  sales: string;
  plan: string;
  size: string;
  amount: string;
  listPrice: string;
  advance: string;
  collectMethod: string;
  original: string;
  isNew: string;
  remarks: string;
  status: string;
  note: string;
  taken: boolean;
}

/** 受注の一意キー（版ごとの取込記録に使用）。タイムスタンプ＋掲載名＋サイズ */
export function orderKey(o: OrderRow): string {
  return `${o.timestamp}__${o.displayName}__${o.size}`;
}

/** エリア版セルを名前配列へ（「大阪市版, 京阪版」「大阪市版、京阪版」等を許容） */
function splitAreas(raw: string): string[] {
  return raw
    .split(/[,、\/\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** エリア版名 → MAMITAN_AREAS のID（一致しなければ null） */
export function areaIdFromName(name: string): string | null {
  return MAMITAN_AREAS.find((a) => a.name === name.trim())?.id ?? null;
}

function num(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * シートの values（2次元配列）を受注行へ変換する。
 * ヘッダー行から列位置を解決するので、列順が多少違っても拾える。
 */
export function parseOrders(values: string[][]): OrderRow[] {
  if (!values.length) return [];
  const header = values[0].map((h) => (h ?? "").trim());
  const idx = (name: string) => {
    const i = header.indexOf(name);
    return i >= 0
      ? i
      : ORDER_HEADERS.indexOf(name as (typeof ORDER_HEADERS)[number]);
  };
  const c = {
    time: idx("タイムスタンプ"),
    area: idx("エリア版"),
    year: idx("発行年"),
    month: idx("発行月"),
    client: idx("クライアント名"),
    ad: idx("広告名"),
    name: idx("掲載名"),
    sales: idx("営業"),
    plan: idx("企画"),
    size: idx("サイズ"),
    amount: idx("金額"),
    list: idx("定価"),
    advance: idx("先請求"),
    method: idx("回収方法"),
    original: idx("原本"),
    isNew: idx("新規"),
    remarks: idx("備考"),
    status: idx("状態"),
    note: idx("取込メモ"),
  };

  const rows: OrderRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i] ?? [];
    const get = (col: number) => (col >= 0 ? (r[col] ?? "").toString() : "");
    const displayName = get(c.name).trim();
    const client = get(c.client).trim();
    const areaRaw = get(c.area);
    // 掲載名もクライアント名もエリア版も空なら実質空行としてスキップ
    if (!displayName && !client && !areaRaw.trim()) continue;

    const areaNames = splitAreas(areaRaw);
    const areaIds: string[] = [];
    const unknownAreas: string[] = [];
    for (const n of areaNames) {
      const id = areaIdFromName(n);
      if (id) areaIds.push(id);
      else unknownAreas.push(n);
    }
    const status = get(c.status).trim();
    rows.push({
      rowIndex: i + 1,
      timestamp: get(c.time),
      areaNames,
      areaIds,
      unknownAreas,
      year: num(get(c.year)),
      month: num(get(c.month)),
      client,
      adName: get(c.ad).trim(),
      displayName,
      sales: get(c.sales).trim(),
      plan: get(c.plan).trim(),
      size: get(c.size).trim(),
      amount: get(c.amount).trim(),
      listPrice: get(c.list).trim(),
      advance: get(c.advance).trim(),
      collectMethod: get(c.method).trim(),
      original: get(c.original).trim(),
      isNew: get(c.isNew).trim(),
      remarks: get(c.remarks).trim(),
      status,
      note: get(c.note).trim(),
      taken: status === ORDER_STATUS_TAKEN,
    });
  }
  return rows;
}
