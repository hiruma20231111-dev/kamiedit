"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MEDIA, type MediaId } from "@/lib/config/media";
import { THEME_STYLES } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { ManuscriptEditor } from "@/components/manuscript-editor";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default function EditorPage({
  params,
}: {
  params: Promise<{ media: string; issueId: string; manuscriptId: string }>;
}) {
  const { media: mediaId, issueId, manuscriptId } = use(params);
  const media = MEDIA[mediaId as MediaId];
  if (!media) notFound();

  const style = THEME_STYLES[media.theme];
  const signedIn = useStore((s) => s.signedIn);
  const loading = useStore((s) => s.loading);
  const manuscript = useStore((s) =>
    s.db.manuscripts.find((m) => m.id === manuscriptId),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/${media.id}/${issueId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {media.name} へ戻る
      </Link>

      <div className={`mb-6 rounded-xl bg-linear-to-br ${style.gradient} p-6 text-white`}>
        <p className="text-sm text-white/90">{media.name} ・ 原稿エディタ</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">
            {manuscript?.display_name || manuscript?.company_name || "原稿"}
          </h1>
          {manuscript && <Badge variant="secondary">{manuscript.size}</Badge>}
        </div>
      </div>

      {manuscript ? (
        <ManuscriptEditor media={media} issueId={issueId} manuscript={manuscript} />
      ) : (
        <Card className={`p-12 text-center ${style.softBg}`}>
          <p className="font-medium">
            {loading
              ? "読み込み中…"
              : signedIn
                ? "原稿が見つかりませんでした"
                : "編集には Google ログインが必要です"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {!signedIn && "右上の「Googleでログイン」からサインインしてください。"}
          </p>
        </Card>
      )}
    </div>
  );
}
