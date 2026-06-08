"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { KIND_LABELS, type MediaConfig } from "@/lib/config/media";
import type { LayoutSlot } from "@/lib/types";
import { spanClass, sizeUnits } from "@/lib/layout";
import { THEME_STYLES } from "@/lib/theme";
import { AddFrameDialog } from "@/components/add-frame-dialog";
import { SlotActionDialog } from "@/components/slot-action-dialog";
import { Badge } from "@/components/ui/badge";
import { PackageCheck, FileText } from "lucide-react";

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
  const moveSlot = useStore((s) => s.moveSlot);
  const [selected, setSelected] = useState<LayoutSlot | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overPage, setOverPage] = useState<number | null>(null);

  const slots = allSlots.filter((s) => s.issue_id === issueId);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{pageCount}ページ構成</span>
        <span>・</span>
        <span>確保枠 {slots.length} 件</span>
        {signedIn && (
          <span className="text-xs">・枠はドラッグで配置換えできます</span>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => {
          const pageSlots = slots.filter((s) => s.page_no === page);
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

              <div
                className={`grid aspect-[3/4] grid-cols-2 grid-rows-4 gap-1.5 rounded-md transition-colors ${
                  overPage === page ? "outline-2 outline-dashed outline-primary/50" : ""
                }`}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  setOverPage(page);
                }}
                onDragLeave={() => overPage === page && setOverPage(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOverPage(null);
                  if (dragId) void moveSlot(dragId, page, null);
                  setDragId(null);
                }}
              >
                {pageSlots.map((slot) => {
                  const hasManuscript = !!slot.manuscript_id;
                  const supplied = slot.source_type === "supplied";
                  const kindLabel =
                    slot.kind && slot.kind !== "ad" ? KIND_LABELS[slot.kind] : null;
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
                        setOverPage(null);
                      }}
                      onDragOver={(e) => {
                        if (!dragId || dragId === slot.id) return;
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOverPage(null);
                        if (dragId && dragId !== slot.id)
                          void moveSlot(dragId, page, slot.id);
                        setDragId(null);
                      }}
                      onClick={() => signedIn && setSelected(slot)}
                      disabled={!signedIn}
                      className={`${spanClass(slot.size)} flex flex-col justify-between overflow-hidden rounded-md border-2 p-1.5 text-left text-xs transition-all ${style.border} ${
                        hasManuscript || supplied ? style.softBg : "bg-background"
                      } ${signedIn ? "cursor-grab hover:shadow-md active:cursor-grabbing" : "cursor-default"} ${
                        dragId === slot.id ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex min-w-0 items-center gap-1">
                          <Badge variant="secondary" className="px-1 py-0 text-[10px]">
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

                {pageSlots.length === 0 && (
                  <div className="col-span-2 row-span-4 flex items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                    {dragId ? "ここにドロップ" : "枠が未確保"}
                  </div>
                )}
              </div>
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
