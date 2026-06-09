import type {
  Issue,
  Manuscript,
  LayoutSlot,
  ManuscriptImage,
  AttackManuscript,
} from "@/lib/types";

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
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : base.updatedAt,
  };
}
