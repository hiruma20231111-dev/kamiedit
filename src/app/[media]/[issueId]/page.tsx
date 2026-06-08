"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MEDIA, type MediaId } from "@/lib/config/media";
import { THEME_STYLES } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { LayoutBoard } from "@/components/layout-board";
import { ManuscriptBoard } from "@/components/manuscript-board";
import { ExportLayoutButton } from "@/components/export-layout-button";
import { ArrowLeft } from "lucide-react";

export default function IssuePage({
  params,
}: {
  params: Promise<{ media: string; issueId: string }>;
}) {
  const { media: mediaId, issueId } = use(params);
  const media = MEDIA[mediaId as MediaId];
  if (!media) notFound();

  const style = THEME_STYLES[media.theme];
  const signedIn = useStore((s) => s.signedIn);
  const issue = useStore((s) => s.db.issues.find((i) => i.id === issueId));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href={`/${media.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {media.name} の号数一覧へ
      </Link>

      <div
        className={`mb-8 flex items-start justify-between gap-4 rounded-xl bg-linear-to-br ${style.gradient} p-6 text-white`}
      >
        <div>
          <p className="text-sm text-white/90">{media.name}</p>
          <h1 className="text-2xl font-bold">{issue?.name ?? "（号数）"}</h1>
        </div>
        {issue && signedIn && media.hasLayout && (
          <div className="shrink-0">
            <ExportLayoutButton issueId={issueId} />
          </div>
        )}
      </div>

      {media.hasLayout ? (
        <LayoutBoard
          media={media}
          issueId={issueId}
          pageCount={issue?.page_count ?? 16}
        />
      ) : (
        <ManuscriptBoard media={media} issueId={issueId} />
      )}
    </div>
  );
}
