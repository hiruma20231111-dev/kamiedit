"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { MediaConfig } from "@/lib/config/media";
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
  const [selected, setSelected] = useState<LayoutSlot | null>(null);

  const slots = allSlots.filter((s) => s.issue_id === issueId);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <span>{pageCount}ページ構成</span>
        <span>・</span>
        <span>確保枠 {slots.length} 件</span>
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

              <div className="grid aspect-[3/4] grid-cols-2 grid-rows-4 gap-1.5">
                {pageSlots.map((slot) => {
                  const hasManuscript = !!slot.manuscript_id;
                  const supplied = slot.source_type === "supplied";
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => signedIn && setSelected(slot)}
                      disabled={!signedIn}
                      className={`${spanClass(slot.size)} flex flex-col justify-between overflow-hidden rounded-md border-2 p-1.5 text-left text-xs transition-all ${style.border} ${
                        hasManuscript || supplied ? style.softBg : "bg-background"
                      } ${signedIn ? "hover:shadow-md cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                          {slot.size}
                        </Badge>
                        {supplied ? (
                          <PackageCheck className={`h-3.5 w-3.5 ${style.text}`} />
                        ) : hasManuscript ? (
                          <FileText className={`h-3.5 w-3.5 ${style.text}`} />
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
                    枠が未確保
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
