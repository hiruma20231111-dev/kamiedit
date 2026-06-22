"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { MEDIA, ORDER_MEDIA, type MediaId } from "@/lib/config/media";
import { type OrderRow } from "@/lib/orders";
import {
  aggregateIssueSales,
  aggregateMediaTotals,
  listPeriods,
  yen,
  pct,
  type IssueSales,
} from "@/lib/sales";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BarChart3, Check, Pencil, RefreshCw, Settings } from "lucide-react";

export default function DashboardPage() {
  const signedIn = useStore((s) => s.signedIn);
  const orderSheets = useStore((s) => s.db.orderSheets ?? {});
  const db = useStore((s) => s.db);
  const fetchOrders = useStore((s) => s.fetchOrders);
  const setSalesConfig = useStore((s) => s.setSalesConfig);

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

  const totals = useMemo(() => aggregateMediaTotals(results), [results]);

  // 号×版の売上目標を保存（0 や空でその版の目標を削除）
  const saveTarget = useCallback(
    async (areaId: string, amount: number) => {
      if (selYear == null || selMonth == null) return;
      const prev = db.salesConfig?.targets ?? [];
      const kept = prev.filter(
        (t) =>
          !(
            t.mediaId === mediaId &&
            t.areaId === areaId &&
            t.year === selYear &&
            t.month === selMonth
          ),
      );
      const next =
        amount > 0
          ? [...kept, { mediaId, areaId, year: selYear, month: selMonth, amount }]
          : kept;
      await setSalesConfig({ targets: next });
    },
    [db.salesConfig, mediaId, selYear, selMonth, setSalesConfig],
  );

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
                {yen(totals.amount)}
              </span>
              {totals.target != null && (
                <span className="text-sm text-muted-foreground">
                  目標 {yen(totals.target)} ・ 達成率{" "}
                  <span className="font-semibold text-foreground">
                    {pct(totals.achievement)}
                  </span>
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                受注 {totals.count} 件 / {totals.areaCount} 版
              </span>
            </div>

            {/* 達成率バー（目標があるときのみ） */}
            {totals.target != null && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/60 dark:bg-black/20">
                <div
                  className="h-full rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((totals.achievement ?? 0) * 100))}%`,
                  }}
                />
              </div>
            )}

            {/* 発行原価・原価回収（現在地）・粗利 */}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                発行原価 {totals.cost != null ? yen(totals.cost) : "—"}
              </span>
              <span className="text-muted-foreground">
                原価回収（現在地）{" "}
                <span className="font-semibold text-foreground">
                  {pct(totals.costRecovery)}
                </span>
              </span>
              <span className="text-muted-foreground">
                1P按分額{" "}
                {totals.pagePortion != null ? yen(totals.pagePortion) : "—"}
              </span>
              <span className="text-muted-foreground">
                粗利{" "}
                <span
                  className={
                    totals.profit != null && totals.profit < 0
                      ? "font-semibold text-red-600 dark:text-red-400"
                      : "font-semibold text-emerald-700 dark:text-emerald-400"
                  }
                >
                  {totals.profit != null ? yen(totals.profit) : "—"}
                </span>
              </span>
            </div>

            {/* 原価回収バー（発行原価に対する売上の現在地） */}
            {totals.cost != null && (
              <div className="mt-2">
                <div className="h-2 overflow-hidden rounded-full bg-white/60 dark:bg-black/20">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-sky-400 to-blue-600 transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((totals.costRecovery ?? 0) * 100))}%`,
                    }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  売上 {yen(totals.amount)} / 発行原価 {yen(totals.cost)}（広告枠で原価を回収）
                </p>
              </div>
            )}

            {(totals.target == null || totals.cost == null) && (
              <p className="mt-2 text-xs text-muted-foreground">
                ※
                {totals.target == null && "各版の目標は下のカードで設定できます。"}
                {totals.cost == null && (
                  <>
                    原価（粗利）は
                    <Link href="/profile" className="text-primary hover:underline">
                      設定画面
                    </Link>
                    のページ単価で算出されます。
                  </>
                )}
              </p>
            )}
          </Card>

          {/* 版ごと */}
          <div className="space-y-3">
            {results.map((r) => (
              <AreaCard key={r.areaId} r={r} onSaveTarget={saveTarget} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 1版ぶんの集計カード（目標のインライン編集・達成率・原価・粗利つき） */
function AreaCard({
  r,
  onSaveTarget,
}: {
  r: IssueSales;
  onSaveTarget: (areaId: string, amount: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(r.target != null ? String(r.target) : "");
    setEditing(true);
  }

  async function commit() {
    const amount = Number(draft.replace(/[^\d.-]/g, "")) || 0;
    setSaving(true);
    try {
      await onSaveTarget(r.areaId, amount);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">{r.areaName}</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-orange-600 dark:text-orange-400">
            {yen(r.amount)}
          </span>
          <Badge variant="secondary">{r.count}件</Badge>
        </div>
      </div>

      {/* 目標・達成率 */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>売上目標 / 達成率</span>
          {editing ? (
            <div className="flex items-center gap-1">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commit();
                  if (e.key === "Escape") setEditing(false);
                }}
                placeholder="目標額"
                inputMode="numeric"
                autoFocus
                className="h-7 w-28 text-sm"
              />
              <Button
                size="sm"
                className="h-7"
                onClick={() => void commit()}
                disabled={saving}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              {r.target != null ? (
                <span>
                  {yen(r.target)} ・{" "}
                  <span className="font-semibold text-foreground">
                    {pct(r.achievement)}
                  </span>
                </span>
              ) : (
                <span className="text-primary">目標を設定</span>
              )}
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
        {r.target != null && (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 transition-all"
              style={{
                width: `${Math.min(100, Math.round((r.achievement ?? 0) * 100))}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* 発行原価・原価回収（現在地）・粗利 */}
      {r.cost != null && (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span>発行原価 {yen(r.cost)}</span>
          <span>
            原価回収{" "}
            <span className="font-semibold text-foreground">
              {pct(r.costRecovery)}
            </span>
          </span>
          <span>
            1P按分額 {r.pagePortion != null ? yen(r.pagePortion) : "—"}
          </span>
          <span>
            粗利{" "}
            <span
              className={
                r.profit != null && r.profit < 0
                  ? "font-semibold text-red-600 dark:text-red-400"
                  : "font-semibold text-emerald-700 dark:text-emerald-400"
              }
            >
              {r.profit != null ? yen(r.profit) : "—"}
            </span>
          </span>
        </div>
      )}

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
                <span className="text-muted-foreground">
                  {yen(p.amount)}
                  {p.target != null && p.target > 0 && (
                    <span className="ml-1 text-xs">
                      / {yen(p.target)}・{pct(p.amount / p.target)}
                    </span>
                  )}
                </span>
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
  );
}
