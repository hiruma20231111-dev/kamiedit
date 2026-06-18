"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { MAMITAN_AREAS } from "@/lib/config/media";
import { isKnownSize, mapOrderSize, orderKey, type OrderRow } from "@/lib/orders";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Inbox, ExternalLink, RefreshCw, FileSpreadsheet, Settings, Check } from "lucide-react";
import { toast } from "sonner";

export default function OrdersPage() {
  const signedIn = useStore((s) => s.signedIn);
  const orderSheetId = useStore((s) => s.db.orderSheetId);
  const orderTakes = useStore((s) => s.db.orderTakes ?? []);
  const fetchOrders = useStore((s) => s.fetchOrders);
  const importOrderArea = useStore((s) => s.importOrderArea);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  // 取込中の「受注×版」キー（rowIndex-areaId）
  const [importing, setImporting] = useState<string | null>(null);
  // 担当版フィルタ（"all" または areaId）
  const [areaFilter, setAreaFilter] = useState<string>("all");

  const refresh = useCallback(async () => {
    if (!orderSheetId) return;
    setLoading(true);
    const rows = await fetchOrders();
    setLoading(false);
    if (rows) setOrders(rows);
  }, [orderSheetId, fetchOrders]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const isTaken = useCallback(
    (o: OrderRow, areaId: string) =>
      // 旧方式でシートに「取込済」が付いた受注も取込済み扱い（二重取込防止）
      o.taken || orderTakes.some((t) => t.key === orderKey(o) && t.areaId === areaId),
    [orderTakes],
  );

  // エリア版ごとに受注を仕分け
  const groups = useMemo(() => {
    return MAMITAN_AREAS.map((area) => {
      const list = orders.filter((o) => o.areaIds.includes(area.id));
      const pending = list.filter((o) => !isTaken(o, area.id));
      const done = list.filter((o) => isTaken(o, area.id));
      return { area, list, pending, done };
    }).filter((g) => g.list.length > 0);
  }, [orders, isTaken]);

  // どの版にも振り分けられない受注（エリア版が未対応）
  const unrouted = useMemo(
    () => orders.filter((o) => o.areaIds.length === 0),
    [orders],
  );

  const visibleGroups =
    areaFilter === "all" ? groups : groups.filter((g) => g.area.id === areaFilter);

  async function handleImportArea(order: OrderRow, areaId: string) {
    if (!order.year || !order.month) {
      toast.error("発行年・月が未入力です（フォーム側で記入してください）");
      return;
    }
    const k = `${order.rowIndex}-${areaId}`;
    setImporting(k);
    const res = await importOrderArea(order, areaId);
    setImporting(null);
    if (!res) {
      toast.error("取込に失敗しました");
      return;
    }
    if (res.alreadyTaken) {
      toast.info("この版へはすでに取込済みです");
      return;
    }
    const areaName = MAMITAN_AREAS.find((a) => a.id === areaId)?.name ?? "";
    toast.success(
      `${areaName} に取込みました（枠 ${res.slotsCreated} 件${res.issuesCreated ? ` / 新規号 ${res.issuesCreated} 件` : ""}）`,
    );
  }

  const sheetUrl = orderSheetId
    ? `https://docs.google.com/spreadsheets/d/${orderSheetId}/edit`
    : null;
  const totalPending = groups.reduce((n, g) => n + g.pending.length, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        トップへ戻る
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Inbox className="h-6 w-6" />
            受注インボックス
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            担当する版を選び、受注を確認して自版の号へ取り込みます（まみたん）。
          </p>
        </div>
        {orderSheetId && (
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            再読込
          </Button>
        )}
      </div>

      {!signedIn ? (
        <Card className="p-8 text-center text-muted-foreground">
          受注の取込には右上から Google ログインしてください。
        </Card>
      ) : !orderSheetId ? (
        <Card className="p-8 text-center">
          <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">受注シートが未設定です</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            受注を受け取るには、最初に1回だけ設定画面で受注シートを作成してください。
          </p>
          <Link href="/profile" className={`mt-4 ${buttonVariants()}`}>
            <Settings className="h-4 w-4" />
            設定画面へ
          </Link>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* 担当版フィルタ */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAreaFilter("all")}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                areaFilter === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              すべての版
              <span className="ml-1 text-xs opacity-80">({totalPending})</span>
            </button>
            {groups.map((g) => (
              <button
                key={g.area.id}
                type="button"
                onClick={() => setAreaFilter(g.area.id)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  areaFilter === g.area.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {g.area.name}
                {g.pending.length > 0 && (
                  <span className="ml-1 text-xs opacity-80">({g.pending.length})</span>
                )}
              </button>
            ))}
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                受注シートを開く
              </a>
            )}
          </div>

          {visibleGroups.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              {loading ? "読み込み中…" : "対象の受注はありません。"}
            </Card>
          ) : (
            visibleGroups.map((g) => (
              <section key={g.area.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold">{g.area.name}</h2>
                  <Badge variant="secondary">未取込 {g.pending.length}</Badge>
                  {g.done.length > 0 && (
                    <Badge variant="outline">取込済 {g.done.length}</Badge>
                  )}
                </div>

                {g.list.map((o) => {
                  const taken = isTaken(o, g.area.id);
                  const k = `${o.rowIndex}-${g.area.id}`;
                  const sizeOk = isKnownSize(o.size);
                  const needsYm = !o.year || !o.month;
                  return (
                    <Card
                      key={k}
                      className={`p-4 ${taken ? "opacity-60" : ""}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {o.displayName || "（掲載名なし）"}
                        </span>
                        <Badge variant="secondary">
                          {o.size || "サイズ未指定"}
                          {o.size && ` → ${mapOrderSize(o.size)}`}
                        </Badge>
                        {o.plan && <Badge variant="outline">{o.plan}</Badge>}
                        <span className="text-sm text-muted-foreground">
                          {o.year ?? "—"}年{o.month ?? "—"}月号
                        </span>
                        {o.areaNames.length > 1 && (
                          <span className="text-xs text-muted-foreground">
                            （受注対象: {o.areaNames.join("・")}）
                          </span>
                        )}
                      </div>

                      {/* 受注内容の確認 */}
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-3">
                        {o.client && <Detail label="クライアント" value={o.client} />}
                        {o.adName && o.adName !== o.client && (
                          <Detail label="広告名" value={o.adName} />
                        )}
                        {o.sales && <Detail label="営業" value={o.sales} />}
                        {o.amount && <Detail label="金額" value={o.amount} />}
                        {o.listPrice && <Detail label="定価" value={o.listPrice} />}
                        {o.advance && <Detail label="先請求" value={o.advance} />}
                        {o.collectMethod && <Detail label="回収方法" value={o.collectMethod} />}
                        {o.timestamp && <Detail label="受信" value={o.timestamp} />}
                      </dl>
                      {o.remarks && (
                        <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                          備考: {o.remarks}
                        </p>
                      )}

                      {/* 警告 */}
                      {(!sizeOk || needsYm) && !taken && (
                        <div className="mt-2 space-y-0.5 text-xs text-amber-600">
                          {needsYm && <p>⚠ 発行年・月が未入力です（フォーム側で記入してください）</p>}
                          {!sizeOk && (
                            <p>
                              ⚠ サイズ{o.size ? `「${o.size}」は未知` : "未指定"}
                              のため取込時は 1/8 になります
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex justify-end">
                        {taken ? (
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Check className="h-4 w-4" />
                            {g.area.name}に取込済
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => void handleImportArea(o, g.area.id)}
                            disabled={importing === k || needsYm}
                          >
                            {importing === k ? "取込中…" : `${g.area.name}に取込`}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </section>
            ))
          )}

          {/* エリア版未対応の受注 */}
          {unrouted.length > 0 && (areaFilter === "all") && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-amber-600">エリア版未対応</h2>
                <Badge variant="outline">{unrouted.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                受注のエリア版が未対応の表記です。フォームの回答を確認してください。
              </p>
              {unrouted.map((o) => (
                <Card key={o.rowIndex} className="p-3 text-sm">
                  <span className="font-medium">{o.displayName || "（掲載名なし）"}</span>
                  {o.unknownAreas.length > 0 && (
                    <span className="ml-2 text-xs text-amber-600">
                      未対応: {o.unknownAreas.join("、")}
                    </span>
                  )}
                </Card>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="truncate">
      <span className="text-muted-foreground/70">{label}: </span>
      <span className="text-foreground/90">{value}</span>
    </div>
  );
}
