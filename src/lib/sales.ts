/**
 * 受注（フォーム）＋台割（割付）から、号ごとの売上・企画・埋まり具合を集計する。
 * 外部スプレッドシートには一切依存しない（営業はフォームのみ操作）。
 */
import type { OrderRow } from "@/lib/orders";
import type { DriveDB, SalesConfig } from "@/lib/db";
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
  /** 企画マスタの目標売上（任意・未設定は null） */
  target: number | null;
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
  /** 売上目標（号×版）。未設定は null */
  target: number | null;
  /** 達成率（実績/目標）。目標未設定は null */
  achievement: number | null;
  /** 発行原価 = ページ単価 × 台割page_count。単価未設定・号未作成は null */
  cost: number | null;
  /** 粗利 = 実績 − 原価。原価不明は null */
  profit: number | null;
}

/** 媒体合計（全エリア版を合算した号の数字） */
export interface MediaTotals {
  amount: number;
  count: number;
  /** 各版の目標合計（1つでも設定があれば数値、無ければ null） */
  target: number | null;
  achievement: number | null;
  /** 各版の原価合計（1つでも単価設定があれば数値、無ければ null） */
  cost: number | null;
  profit: number | null;
  /** 受注のある版数 */
  areaCount: number;
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
  config?: SalesConfig | null,
): IssueSales {
  const areas = MEDIA[mediaId].areas ?? [];
  const areaName = areas.find((a) => a.id === areaId)?.name ?? "";
  const cfg = config ?? db.salesConfig ?? null;

  const rows = orders.filter(
    (o) => o.areaIds.includes(areaId) && o.year === year && o.month === month,
  );

  let amount = 0;
  const planMap = new Map<string, PlanAgg>();
  for (const o of rows) {
    const a = parseAmount(o.amount);
    amount += a;
    const key = o.plan || "（企画なし）";
    const p = planMap.get(key) ?? { plan: key, amount: 0, count: 0, target: null };
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

  // 売上目標・達成率（号×版）
  // 手入力の目標（号×版）があれば優先。無ければ「目標ページ単価 × 台割page_count」で自動算出。
  const explicitTarget =
    cfg?.targets.find(
      (t) =>
        t.mediaId === mediaId &&
        t.areaId === areaId &&
        t.year === year &&
        t.month === month,
    )?.amount ?? null;
  const targetUnit = cfg?.targetPageUnitPrice?.[mediaId];
  const autoTarget =
    targetUnit != null && targetUnit > 0 && pageCount != null
      ? targetUnit * pageCount
      : null;
  const target = explicitTarget != null ? explicitTarget : autoTarget;
  const achievement = target && target > 0 ? amount / target : null;

  // 原価・粗利（原価 = ページ単価 × 台割page_count）
  const unit = cfg?.pageUnitPrice?.[mediaId];
  const cost =
    unit != null && unit > 0 && pageCount != null ? unit * pageCount : null;
  const profit = cost != null ? amount - cost : null;

  // 企画別目標をマスタから付与し、受注ゼロでも目標がある企画は補完する
  const planTargets = new Map<string, number>();
  for (const pm of cfg?.plans ?? []) {
    if (pm.mediaId === mediaId && pm.targetAmount != null) {
      planTargets.set(pm.name, pm.targetAmount);
    }
  }
  const plans = [...planMap.values()];
  for (const pm of cfg?.plans ?? []) {
    if (pm.mediaId !== mediaId || pm.targetAmount == null) continue;
    if (!planMap.has(pm.name)) {
      plans.push({ plan: pm.name, amount: 0, count: 0, target: null });
    }
  }
  for (const p of plans) p.target = planTargets.get(p.plan) ?? null;
  plans.sort((a, b) => b.amount - a.amount);

  return {
    areaId,
    areaName,
    amount,
    count: rows.length,
    plans,
    fillRate,
    usedCells,
    totalCells,
    pageCount,
    target,
    achievement,
    cost,
    profit,
  };
}

/** 各版の集計から媒体合計を出す（達成率・原価・粗利も合算） */
export function aggregateMediaTotals(results: IssueSales[]): MediaTotals {
  let amount = 0;
  let count = 0;
  let target = 0;
  let hasTarget = false;
  let cost = 0;
  let hasCost = false;
  for (const r of results) {
    amount += r.amount;
    count += r.count;
    if (r.target != null) {
      target += r.target;
      hasTarget = true;
    }
    if (r.cost != null) {
      cost += r.cost;
      hasCost = true;
    }
  }
  const t = hasTarget ? target : null;
  const c = hasCost ? cost : null;
  return {
    amount,
    count,
    target: t,
    achievement: t && t > 0 ? amount / t : null,
    cost: c,
    profit: c != null ? amount - c : null,
    areaCount: results.filter((r) => r.count > 0).length,
  };
}

/** 達成率などのパーセント表記（0.85 →「85%」）。null は「—」 */
export function pct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

/** 円表記 */
export function yen(n: number): string {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}
