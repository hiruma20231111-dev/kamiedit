"use client";

import { useState, useTransition } from "react";
import { useStore } from "@/lib/store";
import type { MediaConfig } from "@/lib/config/media";
import type { Manuscript } from "@/lib/types";
import {
  buildInstructionHtml,
  printInstruction,
  exportPhotosZip,
  type ExportCtx,
} from "@/lib/export";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Images } from "lucide-react";
import { toast } from "sonner";

/** 1原稿ぶんのデザイナー向け出力（指示書PDF / 写真ZIP） */
export function ManuscriptExport({
  media,
  issueId,
  manuscript,
}: {
  media: MediaConfig;
  issueId: string;
  manuscript: Manuscript;
}) {
  const token = useStore((s) => s.token);
  const issue = useStore((s) => s.db.issues.find((i) => i.id === issueId));
  const allSlots = useStore((s) => s.db.slots);
  const allImages = useStore((s) => s.db.images);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (!issue) return null;

  const slots = allSlots.filter((s) => s.issue_id === issueId);
  const images = allImages
    .filter((i) => i.manuscript_id === manuscript.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const ctx: ExportCtx = { media, issue, slots };
  const manuscripts = [manuscript];
  const title = manuscript.display_name || manuscript.company_name || "この原稿";

  function doPrint() {
    const html = buildInstructionHtml(manuscripts, images, ctx);
    const ok = printInstruction(html);
    if (!ok) toast.error("ポップアップがブロックされました。許可してください");
  }

  function doZip() {
    if (!token) {
      toast.error("サインインが必要です");
      return;
    }
    if (images.length === 0) {
      toast.error("写真がありません");
      return;
    }
    startTransition(async () => {
      try {
        const n = await exportPhotosZip(manuscripts, images, ctx, token);
        toast.success(`写真 ${n} 点をZIPでダウンロードしました`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "ZIP作成に失敗しました");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted">
        <Download className="h-4 w-4" />
        デザイナー向けDL
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>デザイナー向けダウンロード</DialogTitle>
          <DialogDescription>
            「{title}」（写真{images.length}点）を出力します。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button variant="outline" className="justify-start" onClick={doPrint}>
            <FileText className="h-4 w-4" />
            指示書を印刷 / PDF保存
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={doZip}
            disabled={pending}
          >
            <Images className="h-4 w-4" />
            {pending ? "ZIP作成中…" : "写真をZIPでダウンロード"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          写真は「号数_ページ_枠番号_店舗名_連番」に自動リネームされます。
        </p>
      </DialogContent>
    </Dialog>
  );
}
