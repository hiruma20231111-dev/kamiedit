/**
 * 受注（フォーム）＋台割（割付）から、号ごとの売上・企画・埋まり具合を集計する。
 * 外部スプレッドシートには一切依存しない（営業はフォームのみ操作）。
 */
import type { OrderRow } from "@/lib/orders";
import type { DriveDB } from "@/lib/db";
import { sizeSpan, COLS, ROWS } from "@/lib/layout";
import { MEDIA, type MediaId } from "@/lib/config/media";

const CELLS_PER_PAGE = COLS * ROWS; // 2×4 = 8

/** 「100,000」「¥100000」等を数値へ */
export function parseAmount(v: string | undefined | null): number {
  if (!v) return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export interface PlanAgg {
  plan: string;
  amount: number;
  count: number;
}

export interface IssueSales {
  areaId: string;
  areaName: string;
  /** 売上実績（受注金額の合計） */
  amount: number;
  /** 受注件数 */
  count: number;
  /** 企画別の売上・件数 */
  plans: PlanAgg[];
  /** 埋まり具合（0..1）。台割の使用セル / 総セル */
  fillRate: number;
  usedCells: number;
  totalCells: number;
  pageCount: number | null;
}

/** 発行号（年・月）の一覧を受注から抽出（新しい順） */
export function listPeriods(orders: OrderRow[]): { year: number; month: number }[] {
  const set = new Map<string, { year: number; month: number }>();
  for (const o of orders) {
    if (o.year != null && o.month != null) {
      set.set(`${o.year}-${o.month}`, { year: o.year, month: o.month });
    }
  }
  return [...set.values()].sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.month - a.month,
  );
}

/** 媒体×エリア版×年×月 の号の集計 */
export function aggregateIssueSales(
  mediaId: MediaId,
  areaId: string,
  year: number,
  month: number,
  orders: OrderRow[],
  db: DriveDB,
): IssueSales {
  const areas = MEDIA[mediaId].areas ?? [];
  const areaName = areas.find((a) => a.id === areaId)?.name ?? "";

  const rows = orders.filter(
    (o) => o.areaIds.includes(areaId) && o.year === year && o.month === month,
  );

  let amount = 0;
  const planMap = new Map<string, PlanAgg>();
  for (const o of rows) {
    const a = parseAmount(o.amount);
    amount += a;
    const key = o.plan || "（企画なし）";
    const p = planMap.get(key) ?? { plan: key, amount: 0, count: 0 };
    p.amount += a;
    p.count += 1;
    planMap.set(key, p);
  }

  // 台割の埋まり具合（その号の割付スロットの占有セル）
  const issue =
    db.issues.find(
      (i) =>
        i.media_id === mediaId &&
        i.area === areaId &&
        i.year === year &&
        i.month === month,
    ) ?? null;
  let usedCells = 0;
  const pageCount = issue?.page_count ?? null;
  if (issue) {
    for (const s of db.slots.filter((s) => s.issue_id === issue.id)) {
      const sp = sizeSpan(s.size);
      usedCells += Math.min(sp.col * sp.row, CELLS_PER_PAGE);
    }
  }
  const totalCells = pageCount ? pageCount * CELLS_PER_PAGE : 0;
  const fillRate = totalCells > 0 ? usedCells / totalCells : 0;

  return {
    areaId,
    areaName,
    amount,
    count: rows.length,
    plans: [...planMap.values()].sort((a, b) => b.amount - a.amount),
    fillRate,
    usedCells,
    totalCells,
    pageCount,
  };
}

/** 円表記 */
export function yen(n: number): string {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}
