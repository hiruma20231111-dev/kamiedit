"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MEDIA, type MediaId } from "@/lib/config/media";
import { THEME_STYLES } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { ArrowLeft, LayoutGrid, List } from "lucide-react";

export default function IssuePage({
  params,
}: {
  params: Promise<{ media: string; issueId: string }>;
}) {
  const { media: mediaId, issueId } = use(params);
  const media = MEDIA[mediaId as MediaId];
  if (!media) notFound();

  const style = THEME_STYLES[media.theme];
  const issue = useStore((s) => s.db.issues.find((i) => i.id === issueId));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={`/${media.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {media.name} の号数一覧へ
      </Link>

      <div
        className={`mb-8 rounded-xl bg-linear-to-br ${style.gradient} p-6 text-white`}
      >
        <p className="text-sm text-white/90">{media.name}</p>
        <h1 className="text-2xl font-bold">{issue?.name ?? "（号数）"}</h1>
      </div>

      <Card
        className={`flex flex-col items-center p-12 text-center ${style.softBg}`}
      >
        {media.hasLayout ? (
          <LayoutGrid className={`h-12 w-12 ${style.text}`} />
        ) : (
          <List className={`h-12 w-12 ${style.text}`} />
        )}
        <h2 className="mt-4 text-lg font-semibold">
          {media.hasLayout ? "割付表（グリッドUI）" : "原稿一覧ダッシュボード"}
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          ここは <strong>Step 3</strong> で実装します。
          {media.hasLayout
            ? "ページ／枠の確保とアクション選択ポップアップを配置予定。"
            : "原稿のリスト表示と「+新規作成」を配置予定。"}
        </p>
      </Card>
    </div>
  );
}
