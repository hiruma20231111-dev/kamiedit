"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MEDIA, type MediaId } from "@/lib/config/media";
import { THEME_STYLES } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { AttackEditor } from "@/components/attack-editor";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default function AttackEditorPage({
  params,
}: {
  params: Promise<{ media: string; attackId: string }>;
}) {
  const { media: mediaId, attackId } = use(params);
  const media = MEDIA[mediaId as MediaId];
  if (!media) notFound();

  const style = THEME_STYLES[media.theme];
  const signedIn = useStore((s) => s.signedIn);
  const loading = useStore((s) => s.loading);
  const attack = useStore((s) => s.db.attacks.find((a) => a.id === attackId));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/${media.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {media.name} へ戻る
      </Link>

      <div className={`mb-6 rounded-xl bg-linear-to-br ${style.gradient} p-6 text-white`}>
        <p className="text-sm text-white/90">{media.name} ・ アタック原稿</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">
            {attack?.title || "アタック原稿（提案イメージ）"}
          </h1>
          {attack && <Badge variant="secondary">{attack.size}</Badge>}
        </div>
      </div>

      {attack ? (
        <AttackEditor media={media} attack={attack} />
      ) : (
        <Card className={`p-12 text-center ${style.softBg}`}>
          <p className="font-medium">
            {loading
              ? "読み込み中…"
              : signedIn
                ? "アタック原稿が見つかりませんでした"
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
