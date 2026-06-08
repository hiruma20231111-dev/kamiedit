"use client";

import { create } from "zustand";
import {
  GOOGLE_CLIENT_ID,
  SCOPES,
  hasGoogleEnv,
} from "@/lib/google/config";
import {
  getAccessToken,
  fetchUserInfo,
  revokeToken,
  type GoogleUser,
} from "@/lib/google/gis";
import * as drive from "@/lib/google/drive";
import { emptyDb, type DriveDB } from "@/lib/db";
import type {
  Issue,
  Manuscript,
  LayoutSlot,
  ManuscriptImage,
  ManuscriptKind,
} from "@/lib/types";
import type { MediaId } from "@/lib/config/media";

interface StoreState {
  configured: boolean; // クライアントID設定済みか
  initialized: boolean; // init 完了
  signingIn: boolean;
  signedIn: boolean;
  user: GoogleUser | null;
  token: string | null;
  folderId: string | null;
  dbFileId: string | null;
  db: DriveDB;
  loading: boolean;
  saving: boolean;
  error: string | null;

  init: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => void;
  reload: () => Promise<void>;
  addIssue: (input: {
    mediaId: MediaId;
    name: string;
    year?: number | null;
    month?: number | null;
    pageCount?: number | null;
  }) => Promise<Issue | null>;
  deleteIssue: (id: string) => Promise<void>;

  // 原稿
  addManuscript: (input: {
    issueId: string;
    mediaId: MediaId;
    size: string;
    variant?: string | null;
    kind?: ManuscriptKind;
    companyName?: string | null;
    displayName?: string | null;
  }) => Promise<Manuscript | null>;
  updateManuscript: (id: string, patch: Partial<Manuscript>) => Promise<void>;
  deleteManuscript: (id: string) => Promise<void>;

  // 割付の枠（まみたん）
  addSlot: (input: {
    issueId: string;
    pageNo: number;
    size: string;
    kind?: ManuscriptKind;
    companyName?: string | null;
    displayName?: string | null;
  }) => Promise<LayoutSlot | null>;
  updateSlot: (id: string, patch: Partial<LayoutSlot>) => Promise<void>;
  deleteSlot: (id: string) => Promise<void>;
  /** 割付の枠を別ページ／位置へ移動（D&D並べ替え）。beforeSlotId の前に挿入、null で末尾 */
  moveSlot: (
    slotId: string,
    toPage: number,
    beforeSlotId: string | null,
  ) => Promise<void>;

  // 画像
  uploadImage: (
    manuscriptId: string,
    file: File,
    role?: string | null,
  ) => Promise<ManuscriptImage | null>;
  deleteImage: (imageId: string) => Promise<void>;

  /** db を更新して Drive へ保存（失敗時ロールバック） */
  commit: (next: DriveDB) => Promise<boolean>;
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export const useStore = create<StoreState>((set, get) => ({
  configured: hasGoogleEnv(),
  initialized: false,
  signingIn: false,
  signedIn: false,
  user: null,
  token: null,
  folderId: null,
  dbFileId: null,
  db: emptyDb(),
  loading: false,
  saving: false,
  error: null,

  /** 起動時：無UIでのサインインを試み、成功すればDBを読み込む */
  init: async () => {
    if (get().initialized) return;
    set({ initialized: true, configured: hasGoogleEnv() });
    if (!hasGoogleEnv()) return;
    try {
      const token = await getAccessToken(GOOGLE_CLIENT_ID, SCOPES, "");
      const user = await fetchUserInfo(token);
      set({ token, user, signedIn: true });
      await get().reload();
    } catch {
      // セッションが無い等：未ログインのまま
    }
  },

  /** 明示的サインイン（UIあり） */
  signIn: async () => {
    if (!hasGoogleEnv()) {
      set({ error: "Google クライアントID が未設定です" });
      return;
    }
    set({ signingIn: true, error: null });
    try {
      const token = await getAccessToken(GOOGLE_CLIENT_ID, SCOPES, "consent");
      const user = await fetchUserInfo(token);
      set({ token, user, signedIn: true });
      await get().reload();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "サインインに失敗しました" });
    } finally {
      set({ signingIn: false });
    }
  },

  signOut: () => {
    const token = get().token;
    if (token) revokeToken(token);
    set({
      signedIn: false,
      user: null,
      token: null,
      folderId: null,
      dbFileId: null,
      db: emptyDb(),
    });
  },

  /** Drive からDBを読み込む（フォルダ/ファイルが無ければ作る） */
  reload: async () => {
    const token = get().token;
    if (!token) return;
    set({ loading: true, error: null });
    try {
      const folderId = await drive.ensureFolder(token);
      let dbFileId = await drive.findDbFile(token, folderId);
      let db: DriveDB;
      if (dbFileId) {
        db = await drive.readDb(token, dbFileId);
      } else {
        db = emptyDb();
        dbFileId = await drive.writeDb(token, folderId, null, db);
      }
      set({ folderId, dbFileId, db });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "読込に失敗しました" });
    } finally {
      set({ loading: false });
    }
  },

  addIssue: async (input) => {
    const { token, folderId, db } = get();
    if (!token || !folderId) {
      set({ error: "サインインが必要です" });
      return null;
    }
    const now = new Date().toISOString();
    const issue: Issue = {
      id: uid(),
      media_id: input.mediaId,
      name: input.name,
      year: input.year ?? null,
      month: input.month ?? null,
      page_count: input.pageCount ?? null,
      created_by: get().user?.email ?? null,
      created_at: now,
      updated_at: now,
    };
    const next: DriveDB = {
      ...db,
      issues: [issue, ...db.issues],
      updatedAt: now,
    };
    set({ saving: true, db: next, error: null });
    try {
      const id = await drive.writeDb(token, folderId, get().dbFileId, next);
      set({ dbFileId: id });
      return issue;
    } catch (e) {
      // 失敗したらロールバック
      set({ db, error: e instanceof Error ? e.message : "保存に失敗しました" });
      return null;
    } finally {
      set({ saving: false });
    }
  },

  deleteIssue: async (id) => {
    const { token, folderId, db } = get();
    if (!token || !folderId) return;
    const next: DriveDB = {
      ...db,
      issues: db.issues.filter((i) => i.id !== id),
      manuscripts: db.manuscripts.filter((m) => m.issue_id !== id),
      slots: db.slots.filter((s) => s.issue_id !== id),
      updatedAt: new Date().toISOString(),
    };
    set({ saving: true, db: next });
    try {
      const fid = await drive.writeDb(token, folderId, get().dbFileId, next);
      set({ dbFileId: fid });
    } catch (e) {
      set({ db, error: e instanceof Error ? e.message : "削除に失敗しました" });
    } finally {
      set({ saving: false });
    }
  },

  moveSlot: async (slotId, toPage, beforeSlotId) => {
    const db = get().db;
    const slot = db.slots.find((s) => s.id === slotId);
    if (!slot) return;
    const issueId = slot.issue_id;

    const outside = db.slots.filter((s) => s.issue_id !== issueId);
    const issueSlots = db.slots.filter(
      (s) => s.issue_id === issueId && s.id !== slotId,
    );

    // ページごとに position 順で並べる
    const pages = new Map<number, LayoutSlot[]>();
    for (const s of issueSlots) {
      const arr = pages.get(s.page_no) ?? [];
      arr.push(s);
      pages.set(s.page_no, arr);
    }
    for (const arr of pages.values())
      arr.sort((a, b) => a.position - b.position);

    // 移動先ページへ挿入
    const moved: LayoutSlot = { ...slot, page_no: toPage };
    const target = pages.get(toPage) ?? [];
    let insertAt = target.length;
    if (beforeSlotId) {
      const i = target.findIndex((s) => s.id === beforeSlotId);
      if (i >= 0) insertAt = i;
    }
    target.splice(insertAt, 0, moved);
    pages.set(toPage, target);

    // position を振り直して再構築
    const now = new Date().toISOString();
    const rebuilt: LayoutSlot[] = [];
    for (const [page, arr] of pages) {
      arr.forEach((s, i) =>
        rebuilt.push({ ...s, page_no: page, position: i, updated_at: now }),
      );
    }

    await get().commit({
      ...db,
      slots: [...outside, ...rebuilt],
      updatedAt: now,
    });
  },

  uploadImage: async (manuscriptId, file, role) => {
    const { token, folderId, db } = get();
    if (!token || !folderId) {
      set({ error: "サインインが必要です" });
      return null;
    }
    set({ saving: true, error: null });
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      const driveName = `img_${manuscriptId}_${Date.now()}.${ext}`;
      const fileId = await drive.uploadFile(token, folderId, driveName, file);
      const existing = db.images.filter((i) => i.manuscript_id === manuscriptId);
      const img: ManuscriptImage = {
        id: uid(),
        manuscript_id: manuscriptId,
        storage_path: fileId,
        original_name: file.name,
        role: role ?? null,
        sort_order: existing.length,
        created_at: new Date().toISOString(),
      };
      const next: DriveDB = {
        ...db,
        images: [...db.images, img],
        updatedAt: new Date().toISOString(),
      };
      const fid = await drive.writeDb(token, folderId, get().dbFileId, next);
      set({ db: next, dbFileId: fid });
      return img;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "画像の保存に失敗しました" });
      return null;
    } finally {
      set({ saving: false });
    }
  },

  deleteImage: async (imageId) => {
    const { token, db } = get();
    const img = db.images.find((i) => i.id === imageId);
    if (token && img) {
      try {
        await drive.deleteFile(token, img.storage_path);
      } catch {
        // Drive側の削除失敗は致命的でないため握りつぶす
      }
    }
    await get().commit({
      ...db,
      images: db.images.filter((i) => i.id !== imageId),
      updatedAt: new Date().toISOString(),
    });
  },

  commit: async (next) => {
    const { token, folderId, db } = get();
    if (!token || !folderId) {
      set({ error: "サインインが必要です" });
      return false;
    }
    set({ saving: true, db: next, error: null });
    try {
      const fid = await drive.writeDb(token, folderId, get().dbFileId, next);
      set({ dbFileId: fid });
      return true;
    } catch (e) {
      set({ db, error: e instanceof Error ? e.message : "保存に失敗しました" });
      return false;
    } finally {
      set({ saving: false });
    }
  },

  addManuscript: async (input) => {
    const now = new Date().toISOString();
    const m: Manuscript = {
      id: uid(),
      issue_id: input.issueId,
      media_id: input.mediaId,
      size: input.size,
      variant: input.variant ?? null,
      kind: input.kind ?? "ad",
      company_name: input.companyName ?? null,
      display_name: input.displayName ?? null,
      genre: null,
      tone: null,
      target: null,
      content: {},
      remarks: null,
      status: "draft",
      created_by: get().user?.email ?? null,
      created_at: now,
      updated_at: now,
    };
    const db = get().db;
    const ok = await get().commit({
      ...db,
      manuscripts: [m, ...db.manuscripts],
      updatedAt: now,
    });
    return ok ? m : null;
  },

  updateManuscript: async (id, patch) => {
    const db = get().db;
    const now = new Date().toISOString();
    await get().commit({
      ...db,
      manuscripts: db.manuscripts.map((m) =>
        m.id === id ? { ...m, ...patch, updated_at: now } : m,
      ),
      updatedAt: now,
    });
  },

  deleteManuscript: async (id) => {
    const db = get().db;
    const now = new Date().toISOString();
    await get().commit({
      ...db,
      manuscripts: db.manuscripts.filter((m) => m.id !== id),
      // 紐づく枠の参照を外す
      slots: db.slots.map((s) =>
        s.manuscript_id === id ? { ...s, manuscript_id: null } : s,
      ),
      updatedAt: now,
    });
  },

  addSlot: async (input) => {
    const db = get().db;
    const now = new Date().toISOString();
    const pageSlots = db.slots.filter(
      (s) => s.issue_id === input.issueId && s.page_no === input.pageNo,
    );
    const slot: LayoutSlot = {
      id: uid(),
      issue_id: input.issueId,
      page_no: input.pageNo,
      position: pageSlots.length,
      size: input.size,
      kind: input.kind ?? "ad",
      company_name: input.companyName ?? null,
      display_name: input.displayName ?? null,
      manuscript_id: null,
      source_type: null,
      created_at: now,
      updated_at: now,
    };
    const ok = await get().commit({
      ...db,
      slots: [...db.slots, slot],
      updatedAt: now,
    });
    return ok ? slot : null;
  },

  updateSlot: async (id, patch) => {
    const db = get().db;
    const now = new Date().toISOString();
    await get().commit({
      ...db,
      slots: db.slots.map((s) =>
        s.id === id ? { ...s, ...patch, updated_at: now } : s,
      ),
      updatedAt: now,
    });
  },

  deleteSlot: async (id) => {
    const db = get().db;
    const slot = db.slots.find((s) => s.id === id);
    const now = new Date().toISOString();
    await get().commit({
      ...db,
      slots: db.slots.filter((s) => s.id !== id),
      // 枠専用に作られた原稿も併せて削除（流用元は触らない方針だが今は枠の原稿を削除）
      manuscripts: slot?.manuscript_id
        ? db.manuscripts.filter((m) => m.id !== slot.manuscript_id)
        : db.manuscripts,
      updatedAt: now,
    });
  },
}));
