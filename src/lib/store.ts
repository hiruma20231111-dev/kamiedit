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
import type { Issue } from "@/lib/types";
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
}));
