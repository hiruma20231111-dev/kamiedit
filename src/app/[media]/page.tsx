"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MEDIA, type MediaId } from "@/lib/config/media";
import { THEME_STYLES } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { NewIssueForm } from "./new-issue-form";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, ChevronRight } from "lucide-react";

export default function MediaPage({
  params,
}: {
  params: Promise<{ media: string }>;
}) {
  const { media: mediaId } = use(params);
  const media = MEDIA[mediaId as MediaId];
  if (!media) notFound();

  const style = THEME_STYLES[media.theme];
  const signedIn = useStore((s) => s.signedIn);
  const loading = useStore((s) => s.loading);
  // セレクタ内で filter して新配列を返すと無限ループになるため、
  // 安定参照(db.issues)を取得してから描画側で絞り込む。
  const allIssues = useStore((s) => s.db.issues);
  const issues = allIssues.filter((i) => i.media_id === media.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        媒体選択へ戻る
      </Link>

      <div
        className={`mb-8 rounded-xl bg-linear-to-br ${style.gradient} p-6 text-white`}
      >
        <h1 className="text-2xl font-bold">{media.name}</h1>
        <p className="mt-1 text-sm text-white/90">
          {media.hasLayout
            ? "割付表で枠を確保して原稿を作成"
            : "原稿一覧から直接作成"}
        </p>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">号数を選択</h2>
        {signedIn && (
          <NewIssueForm
            mediaId={media.id}
            hasLayout={media.hasLayout}
            pageOptions={media.pageOptions}
          />
        )}
      </div>

      {issues.length === 0 ? (
        <Card className={`p-10 text-center ${style.softBg}`}>
          <BookOpen className={`mx-auto h-10 w-10 ${style.text}`} />
          <p className="mt-3 font-medium">
            {loading ? "読み込み中…" : "まだ号数がありません"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {signedIn
              ? "「新規号を作成」から最初の号を追加してください。"
              : "編集・保存には右上から Google ログインしてください。"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <Link key={issue.id} href={`/${media.id}/${issue.id}`}>
              <Card className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50">
                <div>
                  <p className="font-semibold">{issue.name}</p>
                  {media.hasLayout && issue.page_count && (
                    <p className="text-xs text-muted-foreground">
                      {issue.page_count}ページ構成
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
