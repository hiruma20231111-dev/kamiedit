"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useStore } from "@/lib/store";
import type { LayoutSlot } from "@/lib/types";
import type { MediaConfig } from "@/lib/config/media";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilePlus2, Copy, FilePen, PackageCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function SlotActionDialog({
  slot,
  media,
  issueId,
  onClose,
}: {
  slot: LayoutSlot | null;
  media: MediaConfig;
  issueId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const addManuscript = useStore((s) => s.addManuscript);
  const updateSlot = useStore((s) => s.updateSlot);
  const deleteSlot = useStore((s) => s.deleteSlot);
  const [pending, startTransition] = useTransition();

  const open = !!slot;

  function run(action: "new" | "reuse" | "edit" | "supplied") {
    if (!slot) return;
    startTransition(async () => {
      if (action === "supplied") {
        await updateSlot(slot.id, { source_type: "supplied" });
        toast.success("供給原稿として登録しました");
        onClose();
        return;
      }

      let manuscriptId = slot.manuscript_id;
      if (action === "edit" && manuscriptId) {
        // 既存原稿を編集
      } else {
        const m = await addManuscript({
          issueId,
          mediaId: media.id,
          size: slot.size,
          kind: slot.kind,
          companyName: slot.company_name,
          displayName: slot.display_name,
        });
        if (!m) {
          toast.error("原稿の作成に失敗しました");
          return;
        }
        manuscriptId = m.id;
        await updateSlot(slot.id, {
          manuscript_id: m.id,
          source_type: action,
        });
      }
      onClose();
      router.push(`/${media.id}/${issueId}/edit/${manuscriptId}`);
    });
  }

  function remove() {
    if (!slot) return;
    startTransition(async () => {
      await deleteSlot(slot.id);
      toast.success("枠を削除しました");
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {slot?.display_name || slot?.company_name || "枠"}（{slot?.size}）
          </DialogTitle>
          <DialogDescription>この枠で行う操作を選択してください。</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Button
            variant="outline"
            className="justify-start"
            disabled={pending}
            onClick={() => run("new")}
          >
            <FilePlus2 className="h-4 w-4" />
            1. 新規作成
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            disabled={pending}
            onClick={() => run("reuse")}
          >
            <Copy className="h-4 w-4" />
            2. 過去原稿流用
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            disabled={pending}
            onClick={() => run("edit")}
          >
            <FilePen className="h-4 w-4" />
            3. 過去原稿編集
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            disabled={pending}
            onClick={() => run("supplied")}
          >
            <PackageCheck className="h-4 w-4" />
            4. 供給原稿
          </Button>

          <Button
            variant="ghost"
            className="mt-2 justify-start text-destructive hover:text-destructive"
            disabled={pending}
            onClick={remove}
          >
            <Trash2 className="h-4 w-4" />
            この枠を削除
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
