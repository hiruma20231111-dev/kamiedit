"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { MAMITAN_AREAS } from "@/lib/config/media";
import { isKnownSize, mapOrderSize, type OrderRow } from "@/lib/orders";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Inbox, ExternalLink, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";

export default function OrdersPage() {
  const signedIn = useStore((s) => s.signedIn);
  const orderSheetId = useStore((s) => s.db.orderSheetId);
  const ensureOrderSheet = useStore((s) => s.ensureOrderSheet);
  const fetchOrders = useStore((s) => s.fetchOrders);
  const importOrder = useStore((s) => s.importOrder);
  const markOrderTaken = useStore((s) => s.markOrderTaken);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  // 行ごとの選択エリア版（rowIndex -> areaId[]）
  const [selected, setSelected] = useState<Record<number, string[]>>({});

  const refresh = useCallback(async () => {
    if (!orderSheetId) return;
    setLoading(true);
    const rows = await fetchOrders();
    setLoading(false);
    if (rows) {
      setOrders(rows);
      // 未選択の行は受注の既定エリア版で初期化
      setSelected((prev) => {
        const next = { ...prev };
        for (const r of rows) {
          if (!next[r.rowIndex]) next[r.rowIndex] = r.areaIds;
        }
        return next;
      });
    }
  }, [orderSheetId, fetchOrders]);

  useEffect(() => {
    // 受注シートを非同期で読み込む（描画後のデータ同期。意図的な副作用）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function handleCreate() {
    setCreating(true);
    const id = await ensureOrderSheet();
    setCreating(false);
    if (id) {
      toast.success("受注インボックスのシートを作成しました");
      void refresh();
    } else {
      toast.error("作成に失敗しました（ログイン状態をご確認ください）");
    }
  }

  function toggleArea(rowIndex: number, areaId: string) {
    setSelected((prev) => {
      const cur = prev[rowIndex] ?? [];
      const next = cur.includes(areaId)
        ? cur.filter((a) => a !== areaId)
        : [...cur, areaId];
      return { ...prev, [rowIndex]: next };
    });
  }

  async function handleImport(order: OrderRow) {
    const sel = selected[order.rowIndex] ?? [];
    if (!order.year || !order.month) {
      toast.error("発行年・月が未入力です（シート側で記入してください）");
      return;
    }
    if (sel.length === 0) {
      toast.error("エリア版を1つ以上選んでください");
      return;
    }
    setImporting(order.rowIndex);
    const res = await importOrder(order, sel);
    if (!res) {
      setImporting(null);
      toast.error("取込に失敗しました");
      return;
    }
    const areaNames = sel
      .map((id) => MAMITAN_AREAS.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .join("、");
    const note = `${order.year}/${order.month} ${areaNames} に取込（枠${res.slotsCreated}・新規号${res.issuesCreated}）`;
    await markOrderTaken(order.rowIndex, note);
    setImporting(null);
    toast.success(
      `割付へ取込みました（枠 ${res.slotsCreated} 件${res.issuesCreated ? ` / 新規号 ${res.issuesCreated} 件` : ""}）`,
    );
    void refresh();
  }

  const sheetUrl = orderSheetId
    ? `https://docs.google.com/spreadsheets/d/${orderSheetId}/edit`
    : null;
  const pending = orders.filter((o) => !o.taken);
  const taken = orders.filter((o) => o.taken);

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
            営業から届いた受注を割付の枠に取り込みます（まみたん）。
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
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">受注インボックスがまだありません</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            共有スプレッドシートを作成します。作成後、シートを営業メンバーに共有（編集可）し、
            連携した Google フォームから受注を投稿してもらいます。
          </p>
          <Button className="mt-4" onClick={() => void handleCreate()} disabled={creating}>
            <Plus className="h-4 w-4" />
            {creating ? "作成中…" : "受注シートを作成"}
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-sm">
              <p className="font-medium">受注シート（営業に共有してください）</p>
              <p className="text-muted-foreground">
                未取込 {pending.length} 件 / 取込済 {taken.length} 件
              </p>
            </div>
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" />
                シートを開く / 共有
              </a>
            )}
          </Card>

          {pending.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              {loading ? "読み込み中…" : "未取込の受注はありません。"}
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map((o) => {
                const sel = selected[o.rowIndex] ?? [];
                const sizeOk = isKnownSize(o.size);
                const needsYm = !o.year || !o.month;
                return (
                  <Card key={o.rowIndex} className="p-4">
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
                    </div>

                    {(o.client || o.adName || o.sales || o.amount || o.remarks) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {o.client && `クライアント: ${o.client}　`}
                        {o.adName && o.adName !== o.client && `広告名: ${o.adName}　`}
                        {o.sales && `営業: ${o.sales}　`}
                        {o.amount && `金額: ${o.amount}　`}
                        {o.remarks && `備考: ${o.remarks}`}
                      </p>
                    )}

                    {/* 取込先エリア版（複数選択可） */}
                    <div className="mt-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        取込先のエリア版（複数可）
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {MAMITAN_AREAS.map((a) => {
                          const on = sel.includes(a.id);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => toggleArea(o.rowIndex, a.id)}
                              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                on
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              }`}
                            >
                              {a.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 警告 */}
                    {(o.unknownAreas.length > 0 || !sizeOk || needsYm) && (
                      <div className="mt-2 space-y-0.5 text-xs text-amber-600">
                        {needsYm && <p>⚠ 発行年・月が未入力です（シートで記入してください）</p>}
                        {!sizeOk && (
                          <p>
                            ⚠ サイズ{o.size ? `「${o.size}」は未知` : "未指定"}
                            のため取込時は 1/8 になります
                          </p>
                        )}
                        {o.unknownAreas.length > 0 && (
                          <p>⚠ 未対応のエリア版: {o.unknownAreas.join("、")}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => void handleImport(o)}
                        disabled={importing === o.rowIndex || needsYm || sel.length === 0}
                      >
                        {importing === o.rowIndex ? "取込中…" : "割付へ取込"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {taken.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                取込済み（{taken.length}）
              </h2>
              <div className="space-y-2">
                {taken.map((o) => (
                  <Card
                    key={o.rowIndex}
                    className="flex items-center justify-between gap-2 p-3 text-sm opacity-70"
                  >
                    <span className="truncate">
                      {o.displayName || "（掲載名なし）"}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {o.note}
                      </span>
                    </span>
                    <Badge variant="secondary">取込済</Badge>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
