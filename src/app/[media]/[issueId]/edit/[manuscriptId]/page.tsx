"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MEDIA, type MediaId } from "@/lib/config/media";
import { THEME_STYLES } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText } from "lucide-react";

export default function EditorPage({
  params,
}: {
  params: Promise<{ media: string; issueId: string; manuscriptId: string }>;
}) {
  const { media: mediaId, issueId, manuscriptId } = use(params);
  const media = MEDIA[mediaId as MediaId];
  if (!media) notFound();

  const style = THEME_STYLES[media.theme];
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

      <div
        className={`mb-6 rounded-xl bg-linear-to-br ${style.gradient} p-6 text-white`}
      >
        <p className="text-sm text-white/90">{media.name} ・ 原稿エディタ</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">
            {manuscript?.display_name ||
              manuscript?.company_name ||
              "新規原稿"}
          </h1>
          {manuscript && (
            <Badge variant="secondary">{manuscript.size}</Badge>
          )}
        </div>
      </div>

      <Card className={`flex flex-col items-center p-12 text-center ${style.softBg}`}>
        <FileText className={`h-12 w-12 ${style.text}`} />
        <h2 className="mt-4 text-lg font-semibold">原稿作成エディタ</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          ここは <strong>Step 4</strong> で実装します。
          サイズ「{manuscript?.size ?? "—"}」に応じた動的フォーム、
          リアルタイム文字数ゲージ、画像ドラッグ＆ドロップ、
          AIアシスト（✨）を配置予定です。
        </p>
      </Card>
    </div>
  );
}
