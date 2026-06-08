"use client";

import { useState, useTransition } from "react";
import { useStore } from "@/lib/store";
import type { MediaConfig } from "@/lib/config/media";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function AddFrameDialog({
  issueId,
  pageNo,
  media,
}: {
  issueId: string;
  pageNo: number;
  media: MediaConfig;
}) {
  const addSlot = useStore((s) => s.addSlot);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [size, setSize] = useState(media.sizes[0]?.size ?? "1/8");
  const [company, setCompany] = useState("");
  const [display, setDisplay] = useState("");

  function submit() {
    startTransition(async () => {
      const slot = await addSlot({
        issueId,
        pageNo,
        size,
        companyName: company.trim() || null,
        displayName: display.trim() || null,
      });
      if (slot) {
        toast.success(`P${pageNo} に ${size} の枠を追加しました`);
        setOpen(false);
        setCompany("");
        setDisplay("");
      } else {
        toast.error("枠の追加に失敗しました");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
      >
        <Plus className="h-3.5 w-3.5" />枠
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>P{pageNo} に枠を追加</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>サイズ</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {media.sizes.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  onClick={() => setSize(s.size)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    size === s.size
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="company">社名</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="株式会社○○"
            />
          </div>
          <div>
            <Label htmlFor="display">掲載名</Label>
            <Input
              id="display"
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
              placeholder="掲載名・店舗名"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              キャンセル
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "追加中..." : "枠を追加"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
