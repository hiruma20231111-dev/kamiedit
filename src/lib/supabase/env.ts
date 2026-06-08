/**
 * Supabase の環境変数が設定済みかどうか。
 * 未設定でもアプリがクラッシュせず「閲覧者モード（未接続）」で動くようにするための判定。
 */
export function hasSupabaseEnv(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
