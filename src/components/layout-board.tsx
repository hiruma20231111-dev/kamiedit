"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { KIND_LABELS, type MediaConfig } from "@/lib/config/media";
import type { LayoutSlot } from "@/lib/types";
import { resolvePlacement, sizeUnits, COLS, ROWS } from "@/lib/layout";
import { THEME_STYLES } from "@/lib/theme";
import { AddFrameDialog } from "@/components/add-frame-dialog";
import { SlotActionDialog } from "@/components/slot-action-dialog";
import { Badge } from "@/components/ui/badge";
import { PackageCheck, FileText } from "lucide-react";

const CELLS: { c: number; r: number }[] = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) CELLS.push({ c, r });
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
  const [selected, setSelected] = useState<LayoutSlot | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCell, setOverCell] = useState<string | null>(null);

  const slots = allSlots.filter((s) => s.issue_id === issueId);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{pageCount}ページ構成</span>
        <span>・</span>
        <span>確保枠 {slots.length} 件</span>
        {signedIn && (
          <span className="text-xs">・枠はドラッグで好きな位置へ配置できます</span>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => {
          const pageSlots = slots.filter((s) => s.page_no === page);
          const placed = resolvePlacement(pageSlots);
          const used = pageSlots.reduce((n, s) => n + sizeUnits(s.size), 0);

          return (
            <div key={page} className="rounded-lg border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">P{page}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs ${used > 8 ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {used}/8
                  </span>
                  {signedIn && (
                    <AddFrameDialog
                      issueId={issueId}
                      pageNo={page}
                      media={media}
                    />
                  )}
                </div>
              </div>

              <div className="grid aspect-[3/4] grid-cols-2 grid-rows-4 gap-1.5">
                {/* 背景のドロップセル（空き位置のみ受け付ける） */}
                {CELLS.map(({ c, r }) => {
                  const key = `${page}:${c}:${r}`;
                  return (
                    <div
                      key={`cell-${c}-${r}`}
                      style={{ gridColumn: c + 1, gridRow: r + 1 }}
                      onDragOver={(e) => {
                        if (!dragId) return;
                        e.preventDefault();
                        setOverCell(key);
                      }}
                      onDragLeave={() =>
                        setOverCell((v) => (v === key ? null : v))
                      }
                      onDrop={(e) => {
                        e.preventDefault();
                        setOverCell(null);
                        if (dragId) void placeSlot(dragId, page, c, r);
                        setDragId(null);
                      }}
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
                  const kindLabel =
                    slot.kind && slot.kind !== "ad"
                      ? KIND_LABELS[slot.kind]
                      : null;
                  const dragging = dragId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      draggable={signedIn}
                      onDragStart={(e) => {
                        setDragId(slot.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", slot.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCell(null);
                      }}
                      onClick={() => signedIn && setSelected(slot)}
                      disabled={!signedIn}
                      style={{
                        gridColumn: `${col + 1} / span ${colSpan}`,
                        gridRow: `${row + 1} / span ${rowSpan}`,
                        zIndex: dragging ? 0 : 10,
                      }}
                      className={`flex flex-col justify-between overflow-hidden rounded-md border-2 p-1.5 text-left text-xs transition-all ${style.border} ${
                        hasManuscript || supplied ? style.softBg : "bg-background"
                      } ${signedIn ? "cursor-grab hover:shadow-md active:cursor-grabbing" : "cursor-default"} ${
                        dragging ? "pointer-events-none opacity-30" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex min-w-0 items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="px-1 py-0 text-[10px]"
                          >
                            {slot.size}
                          </Badge>
                          {kindLabel && (
                            <span
                              className={`rounded px-1 text-[9px] font-semibold ${style.softBg} ${style.text}`}
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
                      <div className="truncate font-medium leading-tight">
                        {slot.display_name || slot.company_name || "（未入力）"}
                      </div>
                    </button>
                  );
                })}
              </div>

              {pageSlots.length === 0 && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {dragId ? "セルにドロップして配置" : "枠が未確保"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <SlotActionDialog
        slot={selected}
        media={media}
        issueId={issueId}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
