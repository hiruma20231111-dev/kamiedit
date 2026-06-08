import Link from "next/link";
import { MEDIA_LIST } from "@/lib/config/media";
import { THEME_STYLES } from "@/lib/theme";
import { getSession } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { ArrowRight, LayoutGrid, List } from "lucide-react";

export default async function Home() {
  const { notConnected, user } = await getSession();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          媒体を選択してください
        </h1>
        <p className="mt-3 text-muted-foreground">
          原稿の作成・割付管理・AIアシストを、媒体ごとのフォーマットで。
        </p>
      </section>

      {notConnected && (
        <div className="mb-8 rounded-lg border border-amber-400/60 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">⚠️ Supabase が未接続です（プレビューモード）</p>
          <p className="mt-1">
            ログイン・号数の保存にはセットアップが必要です。
            <code className="mx-1 rounded bg-amber-100 px-1 dark:bg-amber-900/40">
              .env.local
            </code>
            に Supabase の URL / anon key を設定してください（README参照）。
          </p>
        </div>
      )}

      {!notConnected && !user && (
        <div className="mb-8 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          閲覧モードです。編集するには右上から Google ログインしてください。
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MEDIA_LIST.map((media) => {
          const style = THEME_STYLES[media.theme];
          return (
            <Link key={media.id} href={`/${media.id}`} className="group">
              <Card
                className={`overflow-hidden border-2 p-0 transition-all hover:-translate-y-1 hover:shadow-lg ring-2 ring-transparent ${style.border} ${style.ring}`}
              >
                <div
                  className={`h-24 bg-linear-to-br ${style.gradient}`}
                  aria-hidden
                />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">{media.name}</h2>
                    <ArrowRight
                      className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${style.text}`}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    {media.hasLayout ? (
                      <>
                        <LayoutGrid className="h-4 w-4" />
                        割付表（グリッド）対応
                      </>
                    ) : (
                      <>
                        <List className="h-4 w-4" />
                        原稿一覧ダッシュボード
                      </>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    テーマ: {style.label} / サイズ {media.sizes.length}種
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
