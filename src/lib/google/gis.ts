/**
 * Google Identity Services (GIS) のトークン取得ラッパー（ブラウザ専用）。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

let scriptPromise: Promise<void> | null = null;

/** GIS スクリプトを一度だけ読み込む */
export function loadGisScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("GISスクリプトの読み込みに失敗しました"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

export interface TokenResult {
  token: string;
  /** 有効秒数（通常3600） */
  expiresIn: number;
}

/**
 * アクセストークンを取得する。
 * prompt: "" は無UIでの取得を試みる（セッションがあれば成功、無ければ失敗）。
 *          "consent" / "select_account" / "select_account consent"（複数指定可）はUIを出す。
 */
export async function getAccessToken(
  clientId: string,
  scope: string,
  prompt: string = "",
): Promise<TokenResult> {
  await loadGisScript();
  const google = window.google;
  if (!google?.accounts?.oauth2) {
    throw new Error("GISが利用できません");
  }

  return new Promise<TokenResult>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      prompt,
      callback: (resp: any) => {
        if (resp?.error) return reject(new Error(resp.error));
        if (!resp?.access_token) return reject(new Error("no_token"));
        resolve({
          token: resp.access_token as string,
          expiresIn: Number(resp.expires_in) || 3600,
        });
      },
      error_callback: (err: any) =>
        reject(new Error(err?.type ?? "oauth_error")),
    });
    client.requestAccessToken({ prompt });
  });
}

/** アクセストークンからユーザー情報を取得 */
export async function fetchUserInfo(token: string): Promise<GoogleUser> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("userinfoの取得に失敗しました");
  const data = await res.json();
  return { email: data.email, name: data.name, picture: data.picture };
}

/** トークンを失効させる（ログアウト用） */
export function revokeToken(token: string) {
  try {
    window.google?.accounts?.oauth2?.revoke(token, () => {});
  } catch {
    // noop
  }
}
