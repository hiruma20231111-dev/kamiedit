import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Issue } from "@/lib/types";

/** 指定媒体の号数一覧を取得（Supabase未接続なら空配列） */
export async function getIssues(mediaId: string): Promise<Issue[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("*")
    .eq("media_id", mediaId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as Issue[]) ?? [];
}

/** 単一の号数を取得 */
export async function getIssue(issueId: string): Promise<Issue | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("*")
    .eq("id", issueId)
    .maybeSingle();
  return (data as Issue) ?? null;
}
