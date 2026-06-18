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
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : base.updatedAt,
  };
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
