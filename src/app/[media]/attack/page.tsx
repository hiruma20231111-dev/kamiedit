"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MEDIA, type MediaId } from "@/lib/config/media";
import { THEME_STYLES } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { AttackList } from "@/components/attack-list";
import { ArrowLeft } from "lucide-react";

export default function AttackIndexPage({
  params,
}: {
  params: Promise<{ media: string }>;
}) {
  const { media: mediaId } = use(params);
  const media = MEDIA[mediaId as MediaId];
  if (!media) notFound();

  const style = THEME_STYLES[media.theme];

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
        <p className="text-sm text-white/90">{media.name} ・ アタック原稿</p>
        <h1 className="mt-1 text-2xl font-bold">アタック原稿</h1>
        <p className="mt-1 text-sm text-white/90">
          営業でクライアントに見せる仮の提案原稿を作成します
        </p>
      </div>

      <AttackList media={media} />
    </div>
  );
}
