/**
 * Google OAuth（リダイレクト方式 / implicit）。ポップアップを使わない。
 *  - ログイン: 全ページ遷移で Google へ → /auth に #access_token で戻る
 *  - 無UI更新: 同一オリジンの隠しiframe（prompt=none）で新トークンを取得
 * これによりポップアップ→openerのpostMessage依存（本番で不安定）を回避する。
 */
import { GOOGLE_CLIENT_ID, SCOPES } from "./config";

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

export interface TokenResult {
  token: string;
  expiresIn: number;
}

/** /auth を redirect_uri にした認可URLを生成 */
export function buildAuthUrl(opts: {
  prompt?: "none" | "consent" | "select_account";
  state?: string;
}): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  u.searchParams.set("redirect_uri", `${window.location.origin}/auth`);
  u.searchParams.set("response_type", "token");
  u.searchParams.set("scope", SCOPES);
  u.searchParams.set("include_granted_scopes", "true");
  if (opts.state) u.searchParams.set("state", opts.state);
  if (opts.prompt) u.searchParams.set("prompt", opts.prompt);
  return u.toString();
}

/** ログイン開始（全ページ遷移） */
export function startLogin(returnPath: string) {
  window.location.assign(
    buildAuthUrl({ state: encodeURIComponent(returnPath || "/") }),
  );
}

/** 無UIでのトークン更新（隠しiframe・同一オリジンでpostMessage受信＝確実） */
export function silentToken(): Promise<TokenResult | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMsg);
      iframe.remove();
    };
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; access_token?: string; expires_in?: string };
      if (!d || d.type !== "kamiedit-auth") return;
      cleanup();
      if (d.access_token) {
        resolve({ token: d.access_token, expiresIn: Number(d.expires_in) || 3600 });
      } else {
        resolve(null);
      }
    };
    window.addEventListener("message", onMsg);
    iframe.src = buildAuthUrl({ prompt: "none", state: "silent" });
    document.body.appendChild(iframe);
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 10000);
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
    void fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      { method: "POST", mode: "no-cors" },
    );
  } catch {
    // noop
  }
}
