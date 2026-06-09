"use client";

import Link from "next/link";
import type { MediaConfig } from "@/lib/config/media";
import { THEME_STYLES } from "@/lib/theme";
import { ArrowUpRight, Megaphone } from "lucide-react";

/**
 * TOP画面で各媒体カードの下に置く「アタック原稿」タブ。
 * サイズ・形状は MediaCard と同一（aspect-[3/4]）に揃える。
 */
export function AttackCard({ media }: { media: MediaConfig }) {
  const style = THEME_STYLES[media.theme];

  return (
    <Link
      href={`/${media.id}/attack`}
      className="group relative block overflow-hidden rounded-2xl border bg-card shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {/* テーマグラデーション背景 */}
        <div className={`h-full w-full bg-linear-to-br ${style.gradient}`} />

        {/* 透かしのメガホン */}
        <Megaphone className="absolute -bottom-6 -right-6 h-44 w-44 text-white/15 transition-transform duration-500 ease-out group-hover:scale-110" />

        {/* スクリム */}
        <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
        {/* テーマアクセントバー */}
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-linear-to-r ${style.gradient}`} />

        {/* 上部ラベル */}
        <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          <Megaphone className="h-3.5 w-3.5" />
          アタック原稿
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-xl font-bold tracking-tight drop-shadow-sm">
              {media.name}
            </h2>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all group-hover:bg-white/40 group-hover:scale-110">
              <ArrowUpRight className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="mt-1.5 text-xs font-medium text-white/85">
            営業の仮提案原稿を作成
          </p>
        </div>
      </div>
    </Link>
  );
}
