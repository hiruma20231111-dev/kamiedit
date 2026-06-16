"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { AreaEdition, MediaId } from "@/lib/config/media";
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
  areas,
}: {
  mediaId: MediaId;
  hasLayout: boolean;
  pageOptions?: number[];
  areas?: AreaEdition[];
}) {
  const router = useRouter();
  const addIssue = useStore((s) => s.addIssue);
  const duplicateIssue = useStore((s) => s.duplicateIssue);
  const allIssues = useStore((s) => s.db.issues);
  const allSlots = useStore((s) => s.db.slots);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const hasAreas = !!areas && areas.length > 0;
  const now = new Date();
  const [name, setName] = useState("");
  const [areaId, setAreaId] = useState(areas?.[0]?.id ?? "");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [pageCount, setPageCount] = useState(pageOptions?.[0] ?? 16);
  // 流用モード
  const [reuse, setReuse] = useState(false);
  const [sourceId, setSourceId] = useState("");

  const areaName = areas?.find((a) => a.id === areaId)?.name ?? "";
  const defaultName = `${year}年${month}月号${areaName ? `（${areaName}）` : ""}`;

  // 同じ媒体の既存の号（流用元の候補）
  const issues = allIssues.filter((i) => i.media_id === mediaId);
  const canReuse = hasLayout && issues.length > 0;
  const sourceIssue = issues.find((i) => i.id === sourceId);
  const sourceFrameCount = sourceId
    ? allSlots.filter((s) => s.issue_id === sourceId).length
    : 0;

  function submit() {
    if (hasAreas && !areaId) {
      toast.error("エリア版を選択してください");
      return;
    }
    startTransition(async () => {
      let issue;
      if (reuse) {
        if (!sourceId) {
          toast.error("流用元の割付を選択してください");
          return;
        }
        issue = await duplicateIssue(sourceId, {
          mediaId,
          name: name.trim() || defaultName,
          area: hasAreas ? areaId : null,
          year,
          month,
        });
      } else {
        issue = await addIssue({
          mediaId,
          name: name.trim() || defaultName,
          area: hasAreas ? areaId : null,
          year,
          month,
          pageCount: hasLayout ? pageCount : null,
        });
      }
      if (issue) {
        toast.success(reuse ? "割付を流用して作成しました" : "号数を作成しました");
        setOpen(false);
        setName("");
        setReuse(false);
        setSourceId("");
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
        {canReuse && (
          <div>
            <Label>作成方法</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReuse(false)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  !reuse
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                ゼロから作成
              </button>
              <button
                type="button"
                onClick={() => setReuse(true)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  reuse
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                割付を流用
              </button>
            </div>
          </div>
        )}

        {reuse && (
          <div>
            <Label htmlFor="source">流用元の割付</Label>
            <select
              id="source"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">選択してください</option>
              {issues.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                  {i.page_count ? `（${i.page_count}P）` : ""}
                </option>
              ))}
            </select>
            {sourceIssue && (
              <p className="mt-1 text-xs text-muted-foreground">
                「{sourceIssue.name}」の枠 {sourceFrameCount} 件とページ構成（
                {sourceIssue.page_count ?? "—"}P）を引き継ぎます。原稿の中身は引き継ぎません。
              </p>
            )}
          </div>
        )}

        {hasAreas && (
          <div>
            <Label htmlFor="area">エリア版</Label>
            <select
              id="area"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {areas!.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              同じ発行号でもエリア版ごとに別の割付になります。
            </p>
          </div>
        )}

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
            placeholder={defaultName}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {hasLayout && pageOptions && !reuse && (
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
