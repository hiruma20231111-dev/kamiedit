"use client";

import Link from "next/link";
import { useState } from "react";
import type { MediaConfig } from "@/lib/config/media";
import { THEME_STYLES } from "@/lib/theme";
import { ArrowUpRight, LayoutGrid, List } from "lucide-react";

export function MediaCard({ media }: { media: MediaConfig }) {
  const style = THEME_STYLES[media.theme];
  const [imgOk, setImgOk] = useState(true);

  return (
    <Link
      href={`/${media.id}`}
      className="group relative block overflow-hidden rounded-2xl border bg-card shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {media.cover && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.cover}
            alt={`${media.name} 表紙`}
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className={`h-full w-full bg-linear-to-br ${style.gradient}`} />
        )}

        {/* スクリム */}
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />
        {/* テーマアクセントバー */}
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-linear-to-r ${style.gradient}`} />

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-xl font-bold tracking-tight drop-shadow-sm">
              {media.name}
            </h2>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all group-hover:bg-white/40 group-hover:scale-110">
              <ArrowUpRight className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-white/85">
            {media.hasLayout ? (
              <LayoutGrid className="h-3.5 w-3.5" />
            ) : (
              <List className="h-3.5 w-3.5" />
            )}
            <span>{media.hasLayout ? "割付表対応" : "原稿一覧"}</span>
            <span className="opacity-60">・</span>
            <span>サイズ{media.sizes.length}種</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
