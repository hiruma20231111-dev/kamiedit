"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { MEDIA, type MediaId } from "@/lib/config/media";

export interface ActionResult {
  ok: boolean;
  message?: string;
  issueId?: string;
}

/** 号数を新規作成（編集者のみ） */
export async function createIssue(input: {
  mediaId: string;
  name: string;
  year?: number | null;
  month?: number | null;
  pageCount?: number | null;
}): Promise<ActionResult> {
  const media = MEDIA[input.mediaId as MediaId];
  if (!media) return { ok: false, message: "媒体が不正です" };

  const session = await getSession();
  if (session.notConnected)
    return { ok: false, message: "Supabaseが未接続です" };
  if (!session.isEditor)
    return { ok: false, message: "編集権限がありません（ログインが必要です）" };

  const name = input.name?.trim();
  if (!name) return { ok: false, message: "号数名を入力してください" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issues")
    .insert({
      media_id: media.id,
      name,
      year: input.year ?? null,
      month: input.month ?? null,
      page_count: media.hasLayout ? (input.pageCount ?? null) : null,
      created_by: session.user!.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${media.id}`);
  return { ok: true, issueId: data.id as string };
}
