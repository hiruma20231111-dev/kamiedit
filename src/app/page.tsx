"use client";

import { MEDIA_LIST } from "@/lib/config/media";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { MediaCard } from "@/components/media-card";
import { OrderInboxBanner } from "@/components/order-inbox-banner";
import { Sparkles, TriangleAlert, Eye, BarChart3, ArrowRight } from "lucide-react";

export default function Home() {
  const configured = useStore((s) => s.configured);
  const signedIn = useStore((s) => s.signedIn);

  return (
    <div className="relative">
      {/* 背景の装飾 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-linear-to-b from-primary/5 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <section className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            編集支援・AIアシスト
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            媒体を選択
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            原稿の作成・割付管理・AIアシストを、媒体ごとのフォーマットで。
          </p>
        </section>

        {!configured && (
          <div className="mx-auto mb-8 flex max-w-2xl items-start gap-3 rounded-xl border border-amber-400/50 bg-amber-50/80 p-4 text-sm text-amber-800 backdrop-blur dark:bg-amber-950/30 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0" />
            <div>
              <p className="font-semibold">Google が未接続です（プレビューモード）</p>
              <p className="mt-0.5 text-amber-700 dark:text-amber-300/90">
                データは各自の Google ドライブに保存します。
                <code className="mx-1 rounded bg-amber-100 px-1 dark:bg-amber-900/40">
                  NEXT_PUBLIC_GOOGLE_CLIENT_ID
                </code>
                を設定してください。
              </p>
            </div>
          </div>
        )}

        {configured && !signedIn && (
          <div className="mx-auto mb-8 flex max-w-2xl items-center gap-2.5 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            <Eye className="h-4.5 w-4.5 shrink-0" />
            閲覧モードです。編集・保存するには右上から Google ログインしてください。
          </div>
        )}

        {/* 使用頻度の高い受注インボックスへの大きな導線（全媒体タブの上） */}
        <OrderInboxBanner />

        {/* 売上・進捗ダッシュボードへの導線 */}
        <Link
          href="/dashboard"
          className="group mb-10 flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/40">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">売上・進捗ダッシュボード</p>
            <p className="text-sm text-muted-foreground">
              号ごとの売上・企画・台割の埋まり具合を自動集計
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MEDIA_LIST.map((media) => (
            <MediaCard key={media.id} media={media} />
          ))}
        </div>
      </div>
    </div>
  );
}
