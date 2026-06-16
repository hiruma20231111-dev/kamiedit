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
import {
  createSpreadsheet,
  getValues,
  updateValues,
} from "@/lib/google/sheets";
import {
  ORDER_HEADERS,
  ORDER_RANGE,
  ORDER_STATUS_TAKEN,
  ORDER_STATUS_COL,
  ORDER_NOTE_COL,
  mapOrderSize,
  parseOrders,
  type OrderRow,
} from "@/lib/orders";
import { MEDIA, MAMITAN_AREAS } from "@/lib/config/media";
import {
  sizeSpan,
  findFreeCell,
  occupancyExcluding,
  resolvePlacement,
  rectsOverlap,
  COLS,
  ROWS,
} from "@/lib/layout";
import { emptyDb, type DriveDB } from "@/lib/db";
import {
  LAYOUT_PKG_KIND,
  LAYOUT_PKG_VERSION,
  type LayoutPackage,
} from "@/lib/layout-transfer";
import type {
  Issue,
  Manuscript,
  LayoutSlot,
  ManuscriptImage,
  ManuscriptKind,
  AttackManuscript,
} from "@/lib/types";
import type { MediaId } from "@/lib/config/media";

interface StoreState {
  configured: boolean; // クライアントID設定済みか
  initialized: boolean; // init 完了
  signingIn: boolean;
  signedIn: boolean;
  /** ログインはできたが Google ドライブのアクセス許可が付与されていない状態 */
  driveDenied: boolean;
  user: GoogleUser | null;
  token: string | null;
  expiresAt: number | null;
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
    area?: string | null;
    year?: number | null;
    month?: number | null;
    pageCount?: number | null;
  }) => Promise<Issue | null>;
  deleteIssue: (id: string) => Promise<void>;
  /** 既存の号の割付（枠）を流用して新しい号を作成する */
  duplicateIssue: (
    sourceIssueId: string,
    input: {
      mediaId: MediaId;
      name: string;
      area?: string | null;
      year?: number | null;
      month?: number | null;
      pageCount?: number | null;
    },
  ) => Promise<Issue | null>;
  /** 号の割付を受け渡し用パッケージへ書き出す（同期・画像は含めない） */
  exportIssue: (issueId: string) => LayoutPackage | null;
  /** 受け渡しパッケージを取り込み、新しい号として作成する */
  importIssue: (pkg: LayoutPackage) => Promise<Issue | null>;

  // アタック原稿（営業の仮提案原稿）
  addAttack: (input: {
    mediaId: MediaId;
    size: string;
  }) => Promise<AttackManuscript | null>;
  updateAttack: (id: string, patch: Partial<AttackManuscript>) => Promise<void>;
  deleteAttack: (id: string) => Promise<void>;

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
  /** 割付の枠をページ内の任意セル(col,row)へ自由配置（D&D）。別ページにも移動可 */
  placeSlot: (
    slotId: string,
    toPage: number,
    col: number,
    row: number,
  ) => Promise<void>;

  // 画像
  uploadImage: (
    manuscriptId: string,
    file: File,
    role?: string | null,
  ) => Promise<ManuscriptImage | null>;
  deleteImage: (imageId: string) => Promise<void>;

  // 受注インボックス（共有スプレッドシート）
  /** 受注シートを用意（無ければ作成しヘッダーを書く）。spreadsheetId を返す */
  ensureOrderSheet: () => Promise<string | null>;
  /** 受注シートを読み、受注行へパースして返す */
  fetchOrders: () => Promise<OrderRow[] | null>;
  /** 受注1件を、指定エリア版の号へ取り込む（号が無ければ作成）。単一commit */
  importOrder: (
    order: OrderRow,
    areaIds: string[],
  ) => Promise<{ slotsCreated: number; issuesCreated: number } | null>;
  /** 受注シートの該当行を「取込済」にし、取込メモを書き込む */
  markOrderTaken: (rowIndex: number, note: string) => Promise<boolean>;

  /** 有効なトークンを返す（失効間際なら無UIで再取得）。取得不可なら null */
  ensureToken: () => Promise<string | null>;
  /** 失効2分前に無UIでトークンを更新するタイマーを（再）設定する */
  scheduleRefresh: () => void;
  /** 無UIでトークンを更新する（タイマー/復帰用・内部利用） */
  _refreshToken: () => Promise<void>;
  /** db を更新して Drive へ保存（失敗時ロールバック） */
  commit: (next: DriveDB) => Promise<boolean>;
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

const SESSION_KEY = "kamiedit.session";

interface PersistedSession {
  token: string;
  expiresAt: number;
  user: GoogleUser;
}

function loadSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PersistedSession;
    if (!s?.token || !s?.expiresAt) return null;
    return s;
  } catch {
    return null;
  }
}

function saveSession(s: PersistedSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // noop
  }
}

function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

// 失効前に無UIでトークンを更新するためのタイマー（タブを開いている間ログインを維持する）
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/** 付与スコープに drive.file が含まれるか（同意画面でDrive許可を外すと欠ける） */
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
function hasDriveScope(grantedScopes: string): boolean {
  return grantedScopes.split(/\s+/).includes(DRIVE_SCOPE);
}

export const useStore = create<StoreState>((set, get) => ({
  configured: hasGoogleEnv(),
  initialized: false,
  signingIn: false,
  signedIn: false,
  driveDenied: false,
  user: null,
  token: null,
  expiresAt: null,
  folderId: null,
  dbFileId: null,
  db: emptyDb(),
  loading: false,
  saving: false,
  error: null,

  /** 起動時：保存済みセッションを復元、無ければ無UIサインインを試す */
  init: async () => {
    if (get().initialized) return;
    set({ initialized: true, configured: hasGoogleEnv() });
    if (!hasGoogleEnv()) return;

    // 過去にログインした記録（localStorage）がある時だけ自動復元/更新する。
    // 記録が無い場合は何もしない（明示的なログインボタンを待つ）→ 不要なポップアップを防ぐ。
    const saved = loadSession();
    if (!saved) return;

    // まだ有効ならそのまま復元
    if (saved.expiresAt > Date.now() + 30_000) {
      set({
        token: saved.token,
        expiresAt: saved.expiresAt,
        user: saved.user,
        signedIn: true,
      });
      get().scheduleRefresh();
      await get().reload();
      return;
    }

    // 失効していたら無UIで更新を試す（以前ログインしていたユーザーのみ）
    try {
      const { token, expiresIn, grantedScopes } = await getAccessToken(
        GOOGLE_CLIENT_ID,
        SCOPES,
        "",
      );
      const user = await fetchUserInfo(token);
      const expiresAt = Date.now() + expiresIn * 1000;
      saveSession({ token, expiresAt, user });
      set({ token, expiresAt, user, signedIn: true, driveDenied: !hasDriveScope(grantedScopes) });
      get().scheduleRefresh();
      await get().reload();
    } catch {
      // 一時的な失敗（3rd-party Cookie制限など）で即ログアウトしない。
      // 記録上のユーザーを保持したままログイン状態を維持し、後でトークン再取得を試みる。
      set({ user: saved.user, signedIn: true });
      clearRefreshTimer();
      refreshTimer = setTimeout(() => void get()._refreshToken(), 60_000);
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
      // 毎回アカウント選択を出す（共有PCで別の人がログインできるように）
      const { token, expiresIn, grantedScopes } = await getAccessToken(
        GOOGLE_CLIENT_ID,
        SCOPES,
        "select_account consent",
      );
      const user = await fetchUserInfo(token);
      const expiresAt = Date.now() + expiresIn * 1000;
      const driveDenied = !hasDriveScope(grantedScopes);
      saveSession({ token, expiresAt, user });
      set({ token, expiresAt, user, signedIn: true, driveDenied });
      get().scheduleRefresh();
      if (driveDenied) {
        // Drive 許可が無いと保存・割付の取り込みが全て失敗する
        set({
          error:
            "Google ドライブへのアクセスが許可されていません。右上から再度ログインし、許可画面で「Google ドライブ」のチェックを入れてください。",
        });
        return;
      }
      await get().reload();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "サインインに失敗しました" });
    } finally {
      set({ signingIn: false });
    }
  },

  signOut: () => {
    clearRefreshTimer();
    const token = get().token;
    if (token) revokeToken(token);
    clearSession();
    set({
      signedIn: false,
      driveDenied: false,
      user: null,
      token: null,
      expiresAt: null,
      folderId: null,
      dbFileId: null,
      db: emptyDb(),
    });
  },

  ensureOrderSheet: async () => {
    const existing = get().db.orderSheetId;
    if (existing) return existing;
    const token = await get().ensureToken();
    if (!token) {
      set({ error: "サインインが必要です" });
      return null;
    }
    try {
      const id = await createSpreadsheet(token, "kamiedit 受注インボックス");
      await updateValues(token, id, "A1", [[...ORDER_HEADERS]]);
      const db = get().db;
      await get().commit({
        ...db,
        orderSheetId: id,
        updatedAt: new Date().toISOString(),
      });
      return id;
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "受注シートの作成に失敗しました",
      });
      return null;
    }
  },

  fetchOrders: async () => {
    const id = get().db.orderSheetId;
    if (!id) return [];
    const token = await get().ensureToken();
    if (!token) return null;
    try {
      const values = await getValues(token, id, ORDER_RANGE);
      return parseOrders(values);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "受注の読込に失敗しました" });
      return null;
    }
  },

  importOrder: async (order, areaIds) => {
    const db = get().db;
    const now = new Date().toISOString();
    const me = get().user?.email ?? null;
    const size = mapOrderSize(order.size);
    const pageDefault = MEDIA.mamitan.pageOptions?.[0] ?? 16;

    const newIssues: Issue[] = [];
    const newSlots: LayoutSlot[] = [];
    let issuesCreated = 0;

    for (const areaId of areaIds) {
      // まみたん × エリア版 × 年 × 月 で号を特定（無ければ作成）
      let issue =
        [...newIssues, ...db.issues].find(
          (i) =>
            i.media_id === "mamitan" &&
            i.area === areaId &&
            i.year === order.year &&
            i.month === order.month,
        ) ?? null;
      if (!issue) {
        const areaName = MAMITAN_AREAS.find((a) => a.id === areaId)?.name ?? "";
        issue = {
          id: uid(),
          media_id: "mamitan",
          name: `${order.year ?? "—"}年${order.month ?? "—"}月号（${areaName}）`,
          area: areaId,
          year: order.year,
          month: order.month,
          page_count: pageDefault,
          created_by: me,
          created_at: now,
          updated_at: now,
        };
        newIssues.push(issue);
        issuesCreated++;
      }

      // 空きのある最初のページへ枠を生成（無ければ P1）
      const issueId = issue.id;
      const pageCount = issue.page_count ?? pageDefault;
      const span = sizeSpan(size);
      let placedPage = 1;
      let cell: { col: number; row: number } = { col: 0, row: 0 };
      for (let p = 1; p <= pageCount; p++) {
        const pageSlots = [...db.slots, ...newSlots].filter(
          (s) => s.issue_id === issueId && s.page_no === p,
        );
        const free = findFreeCell(occupancyExcluding(pageSlots, ""), span);
        if (free) {
          placedPage = p;
          cell = free;
          break;
        }
      }
      const positionBase = [...db.slots, ...newSlots].filter(
        (s) => s.issue_id === issueId && s.page_no === placedPage,
      ).length;
      newSlots.push({
        id: uid(),
        issue_id: issueId,
        page_no: placedPage,
        position: positionBase,
        col: cell.col,
        row: cell.row,
        size,
        kind: "ad",
        company_name: order.client || null,
        display_name: order.displayName || null,
        manuscript_id: null,
        source_type: null,
        created_at: now,
        updated_at: now,
      });
    }

    const ok = await get().commit({
      ...db,
      issues: [...newIssues, ...db.issues],
      slots: [...db.slots, ...newSlots],
      updatedAt: now,
    });
    return ok ? { slotsCreated: newSlots.length, issuesCreated } : null;
  },

  markOrderTaken: async (rowIndex, note) => {
    const id = get().db.orderSheetId;
    const token = await get().ensureToken();
    if (!id || !token) return false;
    try {
      await updateValues(
        token,
        id,
        `${ORDER_STATUS_COL}${rowIndex}:${ORDER_NOTE_COL}${rowIndex}`,
        [[ORDER_STATUS_TAKEN, note]],
      );
      return true;
    } catch {
      return false;
    }
  },

  ensureToken: async () => {
    const { token, expiresAt, user } = get();
    if (token && expiresAt && expiresAt > Date.now() + 60_000) {
      return token;
    }
    // 失効間際 → 無UIで再取得
    if (!hasGoogleEnv() || !user) return token; // フォールバック
    try {
      const res = await getAccessToken(GOOGLE_CLIENT_ID, SCOPES, "");
      const newExpiry = Date.now() + res.expiresIn * 1000;
      saveSession({ token: res.token, expiresAt: newExpiry, user });
      set({ token: res.token, expiresAt: newExpiry });
      get().scheduleRefresh();
      return res.token;
    } catch {
      return token; // 取れなければ既存トークンで試す
    }
  },

  scheduleRefresh: () => {
    clearRefreshTimer();
    if (typeof window === "undefined") return;
    const expiresAt = get().expiresAt;
    if (!expiresAt) return;
    // 失効2分前に無UIで更新（最短10秒）。タブを開いている限りログインが切れない
    const delay = Math.max(10_000, expiresAt - Date.now() - 120_000);
    refreshTimer = setTimeout(() => void get()._refreshToken(), delay);
  },

  _refreshToken: async () => {
    const user = get().user;
    if (!hasGoogleEnv() || !user) return;
    try {
      const res = await getAccessToken(GOOGLE_CLIENT_ID, SCOPES, "");
      const expiresAt = Date.now() + res.expiresIn * 1000;
      saveSession({ token: res.token, expiresAt, user });
      set({
        token: res.token,
        expiresAt,
        signedIn: true,
        driveDenied: !hasDriveScope(res.grantedScopes),
      });
      // 初回復元に失敗してまだ未読込なら、このタイミングでDriveを読む
      if (!get().dbFileId && !get().driveDenied) await get().reload();
      get().scheduleRefresh();
    } catch {
      // 更新に失敗してもログアウトはしない。5分後に再試行する
      clearRefreshTimer();
      refreshTimer = setTimeout(() => void get()._refreshToken(), 5 * 60_000);
    }
  },

  /** Drive からDBを読み込む（フォルダ/ファイルが無ければ作る） */
  reload: async () => {
    const token = await get().ensureToken();
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
      set({ folderId, dbFileId, db, driveDenied: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "読込に失敗しました";
      // 401/403 は Drive アクセス許可が無い可能性が高い
      if (/\b(401|403)\b/.test(msg)) {
        set({
          driveDenied: true,
          error:
            "Google ドライブにアクセスできません。再ログインして「Google ドライブ」を許可してください。",
        });
      } else {
        set({ error: msg });
      }
    } finally {
      set({ loading: false });
    }
  },

  addIssue: async (input) => {
    const now = new Date().toISOString();
    const issue: Issue = {
      id: uid(),
      media_id: input.mediaId,
      name: input.name,
      area: input.area ?? null,
      year: input.year ?? null,
      month: input.month ?? null,
      page_count: input.pageCount ?? null,
      created_by: get().user?.email ?? null,
      created_at: now,
      updated_at: now,
    };
    const db = get().db;
    const ok = await get().commit({
      ...db,
      issues: [issue, ...db.issues],
      updatedAt: now,
    });
    return ok ? issue : null;
  },

  deleteIssue: async (id) => {
    const db = get().db;
    await get().commit({
      ...db,
      issues: db.issues.filter((i) => i.id !== id),
      manuscripts: db.manuscripts.filter((m) => m.issue_id !== id),
      slots: db.slots.filter((s) => s.issue_id !== id),
      updatedAt: new Date().toISOString(),
    });
  },

  duplicateIssue: async (sourceIssueId, input) => {
    const now = new Date().toISOString();
    const db = get().db;
    const source = db.issues.find((i) => i.id === sourceIssueId);
    const issue: Issue = {
      id: uid(),
      media_id: input.mediaId,
      name: input.name,
      area: input.area ?? null,
      year: input.year ?? null,
      month: input.month ?? null,
      page_count: input.pageCount ?? source?.page_count ?? null,
      created_by: get().user?.email ?? null,
      created_at: now,
      updated_at: now,
    };
    // 流用元の枠をコピー（原稿リンクは引き継がず、空の枠として複製）
    const newSlots: LayoutSlot[] = db.slots
      .filter((s) => s.issue_id === sourceIssueId)
      .map((s) => ({
        ...s,
        id: uid(),
        issue_id: issue.id,
        manuscript_id: null,
        source_type: null,
        created_at: now,
        updated_at: now,
      }));
    const ok = await get().commit({
      ...db,
      issues: [issue, ...db.issues],
      slots: [...db.slots, ...newSlots],
      updatedAt: now,
    });
    return ok ? issue : null;
  },

  exportIssue: (issueId) => {
    const db = get().db;
    const issue = db.issues.find((i) => i.id === issueId);
    if (!issue) return null;
    return {
      kind: LAYOUT_PKG_KIND,
      version: LAYOUT_PKG_VERSION,
      exportedAt: new Date().toISOString(),
      mediaId: issue.media_id,
      issueName: issue.name,
      pageCount: issue.page_count,
      slots: db.slots.filter((s) => s.issue_id === issueId),
      manuscripts: db.manuscripts.filter((m) => m.issue_id === issueId),
    };
  },

  importIssue: async (pkg) => {
    const now = new Date().toISOString();
    const db = get().db;
    const me = get().user?.email ?? null;
    const newIssueId = uid();
    const issue: Issue = {
      id: newIssueId,
      media_id: pkg.mediaId,
      name: `${pkg.issueName}（取り込み）`,
      year: null,
      month: null,
      page_count: pkg.pageCount,
      created_by: me,
      created_at: now,
      updated_at: now,
    };
    // 原稿IDを振り直し（枠からの参照も付け替える）。画像は引き継がない
    const idMap = new Map<string, string>();
    const manuscripts: Manuscript[] = pkg.manuscripts.map((m) => {
      const nid = uid();
      idMap.set(m.id, nid);
      return {
        ...m,
        id: nid,
        issue_id: newIssueId,
        created_by: me,
        created_at: now,
        updated_at: now,
      };
    });
    const slots: LayoutSlot[] = pkg.slots.map((s) => ({
      ...s,
      id: uid(),
      issue_id: newIssueId,
      manuscript_id: s.manuscript_id ? idMap.get(s.manuscript_id) ?? null : null,
      created_at: now,
      updated_at: now,
    }));
    const ok = await get().commit({
      ...db,
      issues: [issue, ...db.issues],
      manuscripts: [...manuscripts, ...db.manuscripts],
      slots: [...db.slots, ...slots],
      updatedAt: now,
    });
    return ok ? issue : null;
  },

  addAttack: async (input) => {
    const now = new Date().toISOString();
    const db = get().db;
    const attack: AttackManuscript = {
      id: uid(),
      media_id: input.mediaId,
      size: input.size,
      title: null,
      content: {},
      free_text: null,
      photos: [],
      created_at: now,
      updated_at: now,
    };
    const ok = await get().commit({
      ...db,
      attacks: [attack, ...db.attacks],
      updatedAt: now,
    });
    return ok ? attack : null;
  },

  updateAttack: async (id, patch) => {
    const db = get().db;
    const now = new Date().toISOString();
    await get().commit({
      ...db,
      attacks: db.attacks.map((a) =>
        a.id === id ? { ...a, ...patch, updated_at: now } : a,
      ),
      updatedAt: now,
    });
  },

  deleteAttack: async (id) => {
    const db = get().db;
    await get().commit({
      ...db,
      attacks: db.attacks.filter((a) => a.id !== id),
      updatedAt: new Date().toISOString(),
    });
  },

  placeSlot: async (slotId, toPage, col, row) => {
    const db = get().db;
    const slot = db.slots.find((s) => s.id === slotId);
    if (!slot) return;

    const span = sizeSpan(slot.size);
    // グリッド範囲内にクランプ
    const c = Math.max(0, Math.min(col, COLS - span.col));
    const r = Math.max(0, Math.min(row, ROWS - span.row));
    const target = { col: c, row: r, colSpan: span.col, rowSpan: span.row };

    // 移動元ページでの自分の現在位置（スワップ時に相手をここへ移す）
    const fromPlaced = resolvePlacement(
      db.slots.filter(
        (s) => s.issue_id === slot.issue_id && s.page_no === slot.page_no,
      ),
    ).find((p) => p.slot.id === slotId);
    const fromCol = fromPlaced?.col ?? slot.col ?? 0;
    const fromRow = fromPlaced?.row ?? slot.row ?? 0;

    // 移動先ページの既存配置（自分を除く）。ぶつかる枠を特定する
    const others = db.slots.filter(
      (s) =>
        s.issue_id === slot.issue_id && s.page_no === toPage && s.id !== slotId,
    );
    const displaced = resolvePlacement(others).filter((p) =>
      rectsOverlap(target, p),
    );

    const now = new Date().toISOString();
    let nextSlots: LayoutSlot[];

    if (displaced.length === 0) {
      // 空き → そのまま配置
      nextSlots = db.slots.map((s) =>
        s.id === slotId
          ? { ...s, page_no: toPage, col: c, row: r, updated_at: now }
          : s,
      );
    } else if (
      displaced.length === 1 &&
      displaced[0].colSpan === span.col &&
      displaced[0].rowSpan === span.row
    ) {
      // 同サイズの枠とぶつかる → 入れ替え（スワップ）
      const otherId = displaced[0].slot.id;
      nextSlots = db.slots.map((s) => {
        if (s.id === slotId)
          return { ...s, page_no: toPage, col: c, row: r, updated_at: now };
        if (s.id === otherId)
          return {
            ...s,
            page_no: slot.page_no,
            col: fromCol,
            row: fromRow,
            updated_at: now,
          };
        return s;
      });
    } else {
      // サイズ違い/複数とぶつかる → 自分を配置し、相手は座標クリアで空きへ再配置
      const displacedIds = new Set(displaced.map((p) => p.slot.id));
      nextSlots = db.slots.map((s) => {
        if (s.id === slotId)
          return { ...s, page_no: toPage, col: c, row: r, updated_at: now };
        if (displacedIds.has(s.id))
          return { ...s, col: undefined, row: undefined, updated_at: now };
        return s;
      });
    }

    await get().commit({ ...db, slots: nextSlots, updatedAt: now });
  },

  uploadImage: async (manuscriptId, file, role) => {
    const token = await get().ensureToken();
    if (!token) {
      set({ error: "サインインが必要です" });
      return null;
    }
    let folderId = get().folderId;
    if (!folderId) {
      try {
        folderId = await drive.ensureFolder(token);
        set({ folderId });
      } catch {
        // 下で判定
      }
    }
    if (!folderId) {
      set({ error: "保存先フォルダの準備に失敗しました" });
      return null;
    }
    const db = get().db;
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
    const db = get().db;
    const token = await get().ensureToken();
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
    const prevDb = get().db;
    const token = await get().ensureToken();
    if (!token) {
      set({ error: "サインインが必要です" });
      return false;
    }
    // フォルダ未準備なら用意する
    let folderId = get().folderId;
    if (!folderId) {
      try {
        folderId = await drive.ensureFolder(token);
        set({ folderId });
      } catch {
        // 下で判定
      }
    }
    if (!folderId) {
      set({ error: "保存先フォルダの準備に失敗しました" });
      return false;
    }
    set({ saving: true, db: next, error: null });
    try {
      const fid = await drive.writeDb(token, folderId, get().dbFileId, next);
      set({ dbFileId: fid });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存に失敗しました";
      if (/\b(401|403)\b/.test(msg)) {
        set({
          db: prevDb,
          driveDenied: true,
          error:
            "Google ドライブに保存できません（アクセス未許可）。再ログインして「Google ドライブ」を許可してください。",
        });
      } else {
        set({ db: prevDb, error: msg });
      }
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
    // 空きセルへ自動配置
    const span = sizeSpan(input.size);
    const occupied = occupancyExcluding(pageSlots, "");
    const free = findFreeCell(occupied, span) ?? { col: 0, row: 0 };
    const slot: LayoutSlot = {
      id: uid(),
      issue_id: input.issueId,
      page_no: input.pageNo,
      position: pageSlots.length,
      col: free.col,
      row: free.row,
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
