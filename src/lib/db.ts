import type {
  Issue,
  Manuscript,
  LayoutSlot,
  ManuscriptImage,
  AttackManuscript,
} from "@/lib/types";
import type { MediaId } from "@/lib/config/media";

/** 受注を「どのエリア版の号へ取り込んだか」の記録（版ごとに独立管理） */
export interface OrderTake {
  /** 媒体ID（まみたん/家庭版ぱど 等） */
  mediaId: MediaId;
  /** 受注の一意キー（タイムスタンプ＋掲載名＋サイズ） */
  key: string;
  /** 取込先エリア版ID */
  areaId: string;
  /** 取り込んだ号ID */
  issueId: string;
  takenAt: string;
}

/** 号ごと×エリア版の売上目標（号＝発行年×月で固定。達成率の分母） */
export interface SalesTarget {
  mediaId: MediaId;
  areaId: string;
  year: number;
  month: number;
  amount: number;
}

/** 企画/特集マスタ（任意で企画別の目標売上も持てる） */
export interface PlanMaster {
  id: string;
  mediaId: MediaId;
  name: string;
  /** 企画別の目標売上（任意・未設定は null） */
  targetAmount?: number | null;
}

/** 売上ダッシュボードの設定（売上目標・原価単価・企画マスタ） */
export interface SalesConfig {
  /** 媒体ごとのページ単価（原価/ページ）。原価 = 単価 × 台割page_count */
  pageUnitPrice: Partial<Record<MediaId, number>>;
  /** 号ごと×エリア版の売上目標 */
  targets: SalesTarget[];
  /** 企画/特集マスタ */
  plans: PlanMaster[];
}

export function emptySalesConfig(): SalesConfig {
  return { pageUnitPrice: {}, targets: [], plans: [] };
}

/**
 * Google ドライブに JSON として保存される「DB」の形。
 * 1ファイル（kamiedit-db.json）に全データを保持する。画像バイナリは別ファイルで、
 * ここには ManuscriptImage（メタdata＋driveのfileId）のみ持つ。
 */
export interface DriveDB {
  version: 1;
  issues: Issue[];
  manuscripts: Manuscript[];
  slots: LayoutSlot[];
  images: ManuscriptImage[];
  attacks: AttackManuscript[];
  /** 【旧】まみたん専用の受注シートID（後方互換。新規は orderSheets を使用） */
  orderSheetId?: string | null;
  /** 媒体ごとの受注インボックス スプレッドシートID（アプリが作成） */
  orderSheets?: Partial<Record<MediaId, string>>;
  /** 受注×エリア版の取込記録（媒体・版ごとに取込済みを判定） */
  orderTakes?: OrderTake[];
  /** 売上ダッシュボードの設定（目標・原価単価・企画マスタ） */
  salesConfig?: SalesConfig;
  updatedAt: string;
}

export function emptyDb(): DriveDB {
  return {
    version: 1,
    issues: [],
    manuscripts: [],
    slots: [],
    images: [],
    attacks: [],
    orderSheetId: null,
    orderSheets: {},
    orderTakes: [],
    salesConfig: emptySalesConfig(),
    updatedAt: new Date().toISOString(),
  };
}

/** 読み込んだ JSON を安全に DriveDB へ正規化する（壊れていても落ちない） */
export function normalizeDb(raw: unknown): DriveDB {
  const base = emptyDb();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<DriveDB>;
  return {
    version: 1,
    issues: Array.isArray(r.issues) ? r.issues : [],
    manuscripts: Array.isArray(r.manuscripts) ? r.manuscripts : [],
    slots: Array.isArray(r.slots) ? r.slots : [],
    images: Array.isArray(r.images) ? r.images : [],
    attacks: Array.isArray(r.attacks) ? r.attacks : [],
    orderSheetId: typeof r.orderSheetId === "string" ? r.orderSheetId : null,
    orderSheets: normalizeOrderSheets(r),
    orderTakes: Array.isArray(r.orderTakes) ? r.orderTakes : [],
    salesConfig: normalizeSalesConfig(r.salesConfig),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : base.updatedAt,
  };
}

/** 売上設定を正規化（旧DBには無いので空で補う。壊れていても落ちない） */
function normalizeSalesConfig(raw: unknown): SalesConfig {
  const base = emptySalesConfig();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<SalesConfig>;
  const pageUnitPrice: Partial<Record<MediaId, number>> = {};
  if (r.pageUnitPrice && typeof r.pageUnitPrice === "object") {
    for (const [k, v] of Object.entries(r.pageUnitPrice)) {
      if (typeof v === "number" && Number.isFinite(v)) {
        pageUnitPrice[k as MediaId] = v;
      }
    }
  }
  const targets = Array.isArray(r.targets)
    ? r.targets.filter(
        (t): t is SalesTarget =>
          !!t &&
          typeof t.mediaId === "string" &&
          typeof t.areaId === "string" &&
          typeof t.year === "number" &&
          typeof t.month === "number" &&
          typeof t.amount === "number",
      )
    : [];
  const plans = Array.isArray(r.plans)
    ? r.plans.filter(
        (p): p is PlanMaster =>
          !!p && typeof p.id === "string" && typeof p.name === "string",
      )
    : [];
  return { pageUnitPrice, targets, plans };
}

/** 媒体ごとの受注シートを正規化。旧 orderSheetId はまみたんへ移行する */
function normalizeOrderSheets(
  r: Partial<DriveDB>,
): Partial<Record<MediaId, string>> {
  const out: Partial<Record<MediaId, string>> = {};
  if (r.orderSheets && typeof r.orderSheets === "object") {
    for (const [k, v] of Object.entries(r.orderSheets)) {
      if (typeof v === "string" && v) out[k as MediaId] = v;
    }
  }
  // 後方互換: 旧 orderSheetId（まみたん専用）を移行
  if (!out.mamitan && typeof r.orderSheetId === "string" && r.orderSheetId) {
    out.mamitan = r.orderSheetId;
  }
  return out;
}
