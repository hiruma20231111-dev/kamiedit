import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { User } from "@supabase/supabase-js";

export interface SessionInfo {
  user: User | null;
  /** 編集者として操作可能か（＝ログイン済み かつ 許可ドメイン） */
  isEditor: boolean;
  /** Supabase 未接続なら true（UIで案内を出す） */
  notConnected: boolean;
}

function isAllowedDomain(email: string | undefined): boolean {
  const raw = process.env.ALLOWED_EDITOR_DOMAINS?.trim();
  if (!raw) return true; // 未設定ならログイン者全員を編集者扱い
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  const allowed = raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return !!domain && allowed.includes(domain);
}

/** サーバー側で現在のユーザーと編集権限を取得する */
export async function getSession(): Promise<SessionInfo> {
  if (!hasSupabaseEnv()) {
    return { user: null, isEditor: false, notConnected: true };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    user,
    isEditor: !!user && isAllowedDomain(user.email),
    notConnected: false,
  };
}
