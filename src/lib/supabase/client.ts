import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ（Client Component）用の Supabase クライアント。
 * 公開鍵（anon key）のみを使用するため、クライアントに含めても安全。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
