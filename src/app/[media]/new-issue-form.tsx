"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { MediaId } from "@/lib/config/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function NewIssueForm({
  mediaId,
  hasLayout,
  pageOptions,
}: {
  mediaId: MediaId;
  hasLayout: boolean;
  pageOptions?: number[];
}) {
  const router = useRouter();
  const addIssue = useStore((s) => s.addIssue);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const now = new Date();
  const [name, setName] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [pageCount, setPageCount] = useState(pageOptions?.[0] ?? 16);

  function submit() {
    startTransition(async () => {
      const issue = await addIssue({
        mediaId,
        name: name.trim() || `${year}年${month}月号`,
        year,
        month,
        pageCount: hasLayout ? pageCount : null,
      });
      if (issue) {
        toast.success("号数を作成しました");
        setOpen(false);
        setName("");
        router.push(`/${mediaId}/${issue.id}`);
      } else {
        toast.error("作成に失敗しました（ログイン状態をご確認ください）");
      }
    });
  }

  const actionLabel = hasLayout ? "割付を作成" : "号を作成";

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {actionLabel}
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-md p-5">
      <h3 className="mb-4 font-semibold">{actionLabel}</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="year">年</Label>
            <Input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="month">月</Label>
            <Input
              id="month"
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="name">号数名（任意）</Label>
          <Input
            id="name"
            placeholder={`${year}年${month}月号`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {hasLayout && pageOptions && (
          <div>
            <Label>ページ構成</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {pageOptions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPageCount(p)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    pageCount === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {p}P
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            キャンセル
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "作成中..." : "作成"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
