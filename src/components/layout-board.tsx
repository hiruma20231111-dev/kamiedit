"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { KIND_LABELS, type MediaConfig } from "@/lib/config/media";
import type { LayoutSlot } from "@/lib/types";
import { resolvePlacement, sizeUnits, COLS, ROWS } from "@/lib/layout";
import { THEME_STYLES } from "@/lib/theme";
import { AddFrameDialog } from "@/components/add-frame-dialog";
import { SlotActionDialog } from "@/components/slot-action-dialog";
import { Badge } from "@/components/ui/badge";
import { PackageCheck, FileText, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

const CELLS: { c: number; r: number }[] = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) CELLS.push({ c, r });
}

/** 配列を size 個ずつのチャンクに分割 */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** 1列に積む見開き数（= 旧来の8ページ/列） */
const SPREADS_PER_COL = 4;

/**
 * 右綴じ冊子の見開き順を作る。各見開きは [右ページ, 左ページ]。
 * 先頭の見開きは [最終ページ, 1ページ]（表裏表紙）、以降は [2,3],[4,5],[6,7]…。
 */
function buildSpreads(pageCount: number): [number, number | null][] {
  if (pageCount <= 0) return [];
  const spreads: [number, number | null][] = [[pageCount, 1]];
  for (let right = 2; right <= pageCount - 2; right += 2) {
    const left = right + 1;
    spreads.push([right, left <= pageCount - 1 ? left : null]);
  }
  return spreads;
}

/** ドラッグ開始とみなす移動量（px）。これ未満はクリック扱い */
const DRAG_THRESHOLD = 5;

/** ポインタ座標直下のドロップ先セル（page,col,row）を求める。dragId の枠自身は無視 */
function cellFromPoint(
  x: number,
  y: number,
  skipId: string | null,
): { page: number; col: number; row: number } | null {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (
      skipId &&
      (el as HTMLElement).closest?.(`[data-slot-id="${skipId}"]`)
    ) {
      continue; // ドラッグ中の枠自身は飛ばす
    }
    const host = (el as HTMLElement).closest?.("[data-cell]") as
      | HTMLElement
      | null;
    const dc = host?.dataset.cell;
    if (dc) {
      const [page, col, row] = dc.split(":").map(Number);
      return { page, col, row };
    }
  }
  return null;
}

export function LayoutBoard({
  media,
  issueId,
  pageCount,
}: {
  media: MediaConfig;
  issueId: string;
  pageCount: number;
}) {
  const style = THEME_STYLES[media.theme];
  const signedIn = useStore((s) => s.signedIn);
  const allSlots = useStore((s) => s.db.slots);
  const placeSlot = useStore((s) => s.placeSlot);
  const setIssuePageCount = useStore((s) => s.setIssuePageCount);
  const [pageBusy, setPageBusy] = useState(false);
  const [selected, setSelected] = useState<LayoutSlot | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCell, setOverCell] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ポインタドラッグの内部状態（再レンダーに依存しない）
  const dragRef = useRef<{
    id: string;
    started: boolean;
    sx: number;
    sy: number;
  } | null>(null);
  // 直前がドラッグだった場合に onClick（ダイアログ表示）を抑止する
  const justDraggedRef = useRef(false);

  const slots = allSlots.filter((s) => s.issue_id === issueId);

  // 本のように右から読む並びなので、初期表示は右端（表紙の見開き）を見せる
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [pageCount]);

  // 右綴じ冊子の見開き順（先頭=[最終ページ,1]、以降[2,3],[4,5]…）を列ごとにまとめる
  const columns = chunk(buildSpreads(pageCount), SPREADS_PER_COL);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    slot: LayoutSlot,
  ) => {
    if (!signedIn || e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { id: slot.id, started: false, sx: e.clientX, sy: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_THRESHOLD) return;
      d.started = true;
      setDragId(d.id);
    }
    const slot = slots.find((s) => s.id === d.id);
    setGhost({
      x: e.clientX,
      y: e.clientY,
      label: slot?.display_name || slot?.company_name || slot?.size || "",
    });
    const cell = cellFromPoint(e.clientX, e.clientY, d.id);
    setOverCell(cell ? `${cell.page}:${cell.col}:${cell.row}` : null);
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (d.started) {
      justDraggedRef.current = true;
      const cell = cellFromPoint(e.clientX, e.clientY, d.id);
      if (cell) void placeSlot(d.id, cell.page, cell.col, cell.row);
    }
    dragRef.current = null;
    setDragId(null);
    setOverCell(null);
    setGhost(null);
  };

  async function changePages(delta: number) {
    const target = pageCount + delta;
    if (target < 1 || pageBusy) return;
    setPageBusy(true);
    const res = await setIssuePageCount(issueId, target);
    setPageBusy(false);
    if (!res.ok && res.overflow > 0) {
      toast.error(
        `ページを減らせません：移動先の空きが足りない枠が ${res.overflow} 件あります。先に枠を整理してください。`,
      );
    } else if (!res.ok) {
      toast.error("ページ数の変更に失敗しました");
    } else if (delta < 0 && res.moved > 0) {
      toast.success(`枠 ${res.moved} 件を前のページへ自動で移動しました`);
    }
  }

  const renderPage = (page: number) => {
    const pageSlots = slots.filter((s) => s.page_no === page);
    const placed = resolvePlacement(pageSlots);
    const used = pageSlots.reduce((n, s) => n + sizeUnits(s.size), 0);

    return (
      <div
        key={page}
        className="w-[150px] shrink-0 rounded-lg border bg-card p-2.5 sm:w-[168px]"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">P{page}</span>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs ${used > 8 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {used}/8
            </span>
            {signedIn && (
              <AddFrameDialog issueId={issueId} pageNo={page} media={media} />
            )}
          </div>
        </div>

        <div className="grid aspect-[3/4] grid-cols-2 grid-rows-4 gap-1.5">
          {/* 背景のドロップセル（空き位置を受け付ける） */}
          {CELLS.map(({ c, r }) => {
            const key = `${page}:${c}:${r}`;
            return (
              <div
                key={`cell-${c}-${r}`}
                data-cell={key}
                style={{ gridColumn: c + 1, gridRow: r + 1 }}
                className={`rounded-md border border-dashed transition-colors ${
                  dragId
                    ? overCell === key
                      ? `${style.softBg} border-primary`
                      : "border-muted-foreground/30"
                    : "border-transparent"
                }`}
              />
            );
          })}

          {/* 枠（明示配置） */}
          {placed.map(({ slot, col, row, colSpan, rowSpan }) => {
            const hasManuscript = !!slot.manuscript_id;
            const supplied = slot.source_type === "supplied";
            // 緑: 自社稿/表紙/巻頭記事の枠。黄: 新規/過去修正/過去流用で原稿が付いた枠
            const isGreen =
              slot.kind === "inhouse" ||
              slot.kind === "lead" ||
              slot.kind === "cover";
            const isYellow =
              !isGreen &&
              (slot.source_type === "new" ||
                slot.source_type === "reuse" ||
                slot.source_type === "edit");
            const toneClass = isGreen
              ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
              : isYellow
                ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40"
                : `${style.border} ${supplied ? style.softBg : "bg-background"}`;
            const kindLabel =
              slot.kind && slot.kind !== "ad" ? KIND_LABELS[slot.kind] : null;
            const dragging = dragId === slot.id;
            // 縦1マスの枠（1/8・1/4Y）は高さが足りず2段が入らないので文字を小さく詰める
            const compact = rowSpan === 1;
            const cellKey = `${page}:${col}:${row}`;
            const isDropTarget = !!dragId && !dragging && overCell === cellKey;
            return (
              <button
                key={slot.id}
                type="button"
                data-slot-id={slot.id}
                data-cell={cellKey}
                onPointerDown={(e) => handlePointerDown(e, slot)}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClick={() => {
                  if (justDraggedRef.current) {
                    justDraggedRef.current = false;
                    return; // 直前のドラッグ操作ではダイアログを開かない
                  }
                  if (signedIn) setSelected(slot);
                }}
                disabled={!signedIn}
                style={{
                  gridColumn: `${col + 1} / span ${colSpan}`,
                  gridRow: `${row + 1} / span ${rowSpan}`,
                  zIndex: dragging ? 30 : 10,
                  touchAction: signedIn ? "none" : undefined,
                }}
                className={`flex flex-col justify-between overflow-hidden rounded-md border-2 text-left text-xs transition-all ${compact ? "p-1" : "p-1.5"} ${toneClass} ${
                  signedIn ? "cursor-grab hover:shadow-md active:cursor-grabbing" : "cursor-default"
                } ${
                  dragging ? "opacity-40" : ""
                } ${isDropTarget ? "ring-2 ring-primary ring-offset-1" : ""}`}
              >
                <div className="flex min-h-0 items-center justify-between gap-1 overflow-hidden">
                  <div className="flex min-w-0 items-center gap-1">
                    <Badge
                      variant="secondary"
                      className={`py-0 ${compact ? "px-0.5 text-[8px]" : "px-1 text-[10px]"}`}
                    >
                      {slot.size}
                    </Badge>
                    {kindLabel && (
                      <span
                        className={`rounded px-1 font-semibold ${compact ? "text-[8px]" : "text-[9px]"} ${style.softBg} ${style.text}`}
                      >
                        {kindLabel}
                      </span>
                    )}
                  </div>
                  {supplied ? (
                    <PackageCheck className={`h-3.5 w-3.5 shrink-0 ${style.text}`} />
                  ) : hasManuscript ? (
                    <FileText className={`h-3.5 w-3.5 shrink-0 ${style.text}`} />
                  ) : null}
                </div>
                <div
                  className={`shrink-0 truncate font-medium ${compact ? "text-[10px] leading-tight" : "leading-tight"}`}
                >
                  {slot.display_name || slot.company_name || "（未入力）"}
                </div>
              </button>
            );
          })}
        </div>

        {pageSlots.length === 0 && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {dragId ? "ここへドロップ" : "枠が未確保"}
          </p>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {signedIn ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-medium text-foreground">ページ数</span>
            <span className="inline-flex items-center overflow-hidden rounded-md border">
              <button
                type="button"
                onClick={() => void changePages(-2)}
                disabled={pageBusy || pageCount <= 2}
                className="px-1.5 py-0.5 hover:bg-muted disabled:opacity-40"
                aria-label="ページを2減らす"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-10 px-2 text-center font-semibold text-foreground">
                {pageCount}P
              </span>
              <button
                type="button"
                onClick={() => void changePages(2)}
                disabled={pageBusy}
                className="px-1.5 py-0.5 hover:bg-muted disabled:opacity-40"
                aria-label="ページを2増やす"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </span>
          </span>
        ) : (
          <span>{pageCount}ページ構成</span>
        )}
        <span>・</span>
        <span>確保枠 {slots.length} 件</span>
        <span>・</span>
        <span className="text-xs">本のように右→左の見開きで表示</span>
        {signedIn && (
          <span className="text-xs">・枠はドラッグで自由に配置／入れ替えできます</span>
        )}
      </div>

      {/* 見開きビュー：右から1・2 → 下へ3・4… 8ページごとに左へ列を追加 */}
      <div ref={scrollRef} className="overflow-x-auto pb-3">
        <div className="flex w-max flex-row-reverse justify-end gap-8">
          {columns.map((spreads, ci) => (
            <div key={ci} className="flex flex-col gap-5">
              {spreads.map((spread, si) => (
                <div
                  key={si}
                  className="flex flex-row-reverse gap-1 rounded-xl bg-muted/40 p-1.5"
                >
                  {spread.map((page, idx) =>
                    page != null ? (
                      renderPage(page)
                    ) : (
                      <div
                        key={`empty-${idx}`}
                        className="w-[150px] shrink-0 sm:w-[168px]"
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ドラッグ中に指先/カーソルへ追従するゴースト */}
      {ghost && (
        <div
          className={`pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 px-2 py-1 text-xs font-medium shadow-lg ${style.border} ${style.softBg}`}
          style={{ left: ghost.x, top: ghost.y }}
        >
          {ghost.label || "枠"}
        </div>
      )}

      <SlotActionDialog
        slot={selected}
        media={media}
        issueId={issueId}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
