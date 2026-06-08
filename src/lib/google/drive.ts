/**
 * Google Drive REST 操作（drive.file スコープ）。
 * アプリ用フォルダ "kamiedit" を作り、その中に DB(JSON) と画像ファイルを置く。
 */
import { DRIVE_FOLDER_NAME, DRIVE_DB_NAME } from "./config";
import type { DriveDB } from "@/lib/db";
import { normalizeDb } from "@/lib/db";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function asJson(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Drive API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/** アプリ用フォルダを取得（無ければ作成）して folderId を返す */
export async function ensureFolder(token: string): Promise<string> {
  const q = encodeURIComponent(
    `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const found = await asJson(
    await fetch(`${API}/files?q=${q}&fields=files(id,name)&spaces=drive`, {
      headers: authHeaders(token),
    }),
  );
  if (found.files?.length) return found.files[0].id as string;

  const created = await asJson(
    await fetch(`${API}/files`, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      }),
    }),
  );
  return created.id as string;
}

/** DBファイルの fileId を探す（無ければ null） */
export async function findDbFile(
  token: string,
  folderId: string,
): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${DRIVE_DB_NAME}' and '${folderId}' in parents and trashed=false`,
  );
  const data = await asJson(
    await fetch(`${API}/files?q=${q}&fields=files(id,name)&spaces=drive`, {
      headers: authHeaders(token),
    }),
  );
  return (data.files?.[0]?.id as string) ?? null;
}

/** DBファイルの中身を読む */
export async function readDb(token: string, fileId: string): Promise<DriveDB> {
  const res = await fetch(`${API}/files/${fileId}?alt=media`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`DB読込失敗: ${res.status}`);
  return normalizeDb(await res.json());
}

/** DBを書き込む。fileId があれば更新、無ければ新規作成して fileId を返す */
export async function writeDb(
  token: string,
  folderId: string,
  fileId: string | null,
  db: DriveDB,
): Promise<string> {
  const content = JSON.stringify(db);

  if (fileId) {
    await asJson(
      await fetch(`${UPLOAD}/files/${fileId}?uploadType=media`, {
        method: "PATCH",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: content,
      }),
    );
    return fileId;
  }

  // 新規作成（multipart: メタ情報 + 本文）
  const boundary = "kamiedit-" + Math.random().toString(36).slice(2);
  const meta = { name: DRIVE_DB_NAME, parents: [folderId] };
  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(meta) +
    `\r\n--${boundary}\r\n` +
    "Content-Type: application/json\r\n\r\n" +
    content +
    `\r\n--${boundary}--`;

  const created = await asJson(
    await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
      method: "POST",
      headers: {
        ...authHeaders(token),
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }),
  );
  return created.id as string;
}

/** 画像など任意ファイルをアップロードして fileId を返す（Step4 で使用） */
export async function uploadFile(
  token: string,
  folderId: string,
  name: string,
  blob: Blob,
): Promise<string> {
  const boundary = "kamiedit-" + Math.random().toString(36).slice(2);
  const meta = { name, parents: [folderId] };
  const head =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(meta) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: ${blob.type || "application/octet-stream"}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;

  const body = new Blob([head, blob, tail]);
  const created = await asJson(
    await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
      method: "POST",
      headers: {
        ...authHeaders(token),
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }),
  );
  return created.id as string;
}
