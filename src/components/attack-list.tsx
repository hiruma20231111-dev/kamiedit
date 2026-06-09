"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { type MediaConfig } from "@/lib/config/media";
import { ATTACK_FORMATS } from "@/lib/config/attack";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";

/** アタック原稿（営業の仮提案原稿）の一覧＋作成UI。媒体別アタックページの本体。 */
export function AttackList({ media }: { media: MediaConfig }) {
  const router = useRouter();
  const signedIn = useStore((s) => s.signedIn);
  const loading = useStore((s) => s.loading);
  const addAttack = useStore((s) => s.addAttack);
  const allAttacks = useStore((s) => s.db.attacks);
  const [picking, setPicking] = useState(false);
  const [pending, startTransition] = useTransition();

  const format = ATTACK_FORMATS[media.id];
  const attacks = allAttacks.filter((a) => a.media_id === media.id);

  function create(size: string) {
    startTransition(async () => {
      const attack = await addAttack({ mediaId: media.id, size });
      if (attack) {
        setPicking(false);
        router.push(`/${media.id}/attack/${attack.id}`);
      } else {
        toast.error("作成に失敗しました（ログイン状態をご確認ください）");
      }
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">アタック原稿を選択</h2>
        {signedIn && !picking && (
          <button
            onClick={() => setPicking(true)}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            作成
          </button>
        )}
      </div>

      {signedIn && picking && (
        <Card className="mb-4 p-4">
          <p className="mb-2 text-sm font-medium">サイズを選んで作成</p>
          <div className="flex flex-wrap gap-2">
            {format.sizes.map((s) => (
              <button
                key={s.size}
                type="button"
                disabled={pending}
                onClick={() => create(s.size)}
                className="rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              キャンセル
            </button>
          </div>
        </Card>
      )}

      {!signedIn ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          アタック原稿の作成・閲覧には右上から Google ログインしてください。
        </Card>
      ) : attacks.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {loading
            ? "読み込み中…"
            : `まだアタック原稿がありません。「作成」から ${format.sizes
                .map((s) => s.label)
                .join("・")} サイズで作れます。`}
        </Card>
      ) : (
        <div className="space-y-2">
          {attacks.map((a) => (
            <Link key={a.id} href={`/${media.id}/attack/${a.id}`}>
              <Card className="flex items-center justify-between p-3 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{a.size}</Badge>
                  <span className="font-medium">
                    {a.title || "（無題のアタック原稿）"}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
