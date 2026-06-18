"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { MEDIA, ORDER_MEDIA, type MediaId } from "@/lib/config/media";
import { type OrderRow } from "@/lib/orders";
import {
  aggregateIssueSales,
  listPeriods,
  yen,
  type IssueSales,
} from "@/lib/sales";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, RefreshCw, Settings } from "lucide-react";

export default function DashboardPage() {
  const signedIn = useStore((s) => s.signedIn);
  const orderSheets = useStore((s) => s.db.orderSheets ?? {});
  const db = useStore((s) => s.db);
  const fetchOrders = useStore((s) => s.fetchOrders);

  const [mediaId, setMediaId] = useState<MediaId>(ORDER_MEDIA[0].id);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<string>(""); // "year-month"

  const orderSheetId = orderSheets[mediaId];

  const refresh = useCallback(async () => {
    if (!orderSheetId) {
      setOrders([]);
      return;
    }
    setLoading(true);
    const rows = await fetchOrders(mediaId);
    setLoading(false);
    if (rows) setOrders(rows);
  }, [orderSheetId, mediaId, fetchOrders]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const periods = useMemo(() => listPeriods(orders), [orders]);

  // 既定の発行号は最新
  useEffect(() => {
    if (periods.length > 0) {
      const top = `${periods[0].year}-${periods[0].month}`;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPeriod((p) => (periods.some((x) => `${x.year}-${x.month}` === p) ? p : top));
    }
  }, [periods]);

  const [selYear, selMonth] = period
    ? period.split("-").map(Number)
    : [null, null];

  const areas = MEDIA[mediaId].areas ?? [];
  const results: IssueSales[] = useMemo(() => {
    if (selYear == null || selMonth == null) return [];
    return areas.map((a) =>
      aggregateIssueSales(mediaId, a.id, selYear, selMonth, orders, db),
    );
  }, [areas, mediaId, selYear, selMonth, orders, db]);

  const totalAmount = results.reduce((n, r) => n + r.amount, 0);
  const totalCount = results.reduce((n, r) => n + r.count, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        トップへ戻る
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BarChart3 className="h-6 w-6" />
            売上・進捗ダッシュボード
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            受注（フォーム）と台割から、号ごとの売上・企画・埋まり具合を自動集計します。
          </p>
        </div>
        {orderSheetId && (
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            再読込
          </Button>
        )}
      </div>

      {/* 媒体タブ */}
      <div className="mb-4 flex flex-wrap gap-2">
        {ORDER_MEDIA.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMediaId(m.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
              mediaId === m.id
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {!signedIn ? (
        <Card className="p-8 text-center text-muted-foreground">
          右上から Google ログインしてください。
        </Card>
      ) : !orderSheetId ? (
        <Card className="p-8 text-center">
          <p className="font-medium">{MEDIA[mediaId].name}の受注シートが未設定です</p>
          <p className="mt-1 text-sm text-muted-foreground">
            設定画面で受注シートを作成すると、受注の集計が表示されます。
          </p>
          <Link href="/profile" className={`mt-4 ${buttonVariants()}`}>
            <Settings className="h-4 w-4" />
            設定画面へ
          </Link>
        </Card>
      ) : periods.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {loading ? "読み込み中…" : "集計できる受注がまだありません。"}
        </Card>
      ) : (
        <div className="space-y-5">
          {/* 発行号セレクタ */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">発行号:</span>
            {periods.map((p) => {
              const key = `${p.year}-${p.month}`;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriod(key)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    period === key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {p.year}年{p.month}月号
                </button>
              );
            })}
          </div>

          {/* 媒体合計 */}
          <Card className="bg-linear-to-r from-amber-50 to-orange-50 p-5 dark:from-amber-950/20 dark:to-orange-950/20">
            <p className="text-sm text-muted-foreground">
              {MEDIA[mediaId].name} {selYear}年{selMonth}月号 合計
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {yen(totalAmount)}
              </span>
              <span className="text-sm text-muted-foreground">
                受注 {totalCount} 件 / {results.filter((r) => r.count > 0).length} 版
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              ※売上目標・原価単価・企画別目標を設定すると、達成率・粗利も表示できます（次フェーズ）。
            </p>
          </Card>

          {/* 版ごと */}
          <div className="space-y-3">
            {results.map((r) => (
              <Card key={r.areaId} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold">{r.areaName}</h2>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {yen(r.amount)}
                    </span>
                    <Badge variant="secondary">{r.count}件</Badge>
                  </div>
                </div>

                {/* 埋まり具合 */}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>台割の埋まり具合</span>
                    <span>
                      {r.pageCount != null
                        ? `${Math.round(r.fillRate * 100)}%（${r.usedCells}/${r.totalCells}マス・${r.pageCount}P）`
                        : "号が未作成"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-amber-400 to-orange-500 transition-all"
                      style={{ width: `${Math.min(100, Math.round(r.fillRate * 100))}%` }}
                    />
                  </div>
                </div>

                {/* 企画別 */}
                {r.plans.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">企画別</p>
                    <div className="space-y-1">
                      {r.plans.map((p) => (
                        <div
                          key={p.plan}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate">
                            {p.plan}
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({p.count})
                            </span>
                          </span>
                          <span className="text-muted-foreground">{yen(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {r.count === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    この版の受注はまだありません。
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
