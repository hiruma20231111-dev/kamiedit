"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  KIND_OPTIONS,
  KIND_LABELS,
  type MediaConfig,
} from "@/lib/config/media";
import type { ManuscriptKind } from "@/lib/types";
import { THEME_STYLES } from "@/lib/theme";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export function ManuscriptBoard({
  media,
  issueId,
}: {
  media: MediaConfig;
  issueId: string;
}) {
  const style = THEME_STYLES[media.theme];
  const router = useRouter();
  const signedIn = useStore((s) => s.signedIn);
  const addManuscript = useStore((s) => s.addManuscript);
  const deleteManuscript = useStore((s) => s.deleteManuscript);
  const allManuscripts = useStore((s) => s.db.manuscripts);
  const manuscripts = allManuscripts.filter((m) => m.issue_id === issueId);

  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [size, setSize] = useState(media.sizes[0]?.size ?? "");
  const [kind, setKind] = useState<ManuscriptKind>("ad");
  const [company, setCompany] = useState("");
  const [display, setDisplay] = useState("");

  function create() {
    startTransition(async () => {
      const m = await addManuscript({
        issueId,
        mediaId: media.id,
        size,
        kind,
        companyName: company.trim() || null,
        displayName: display.trim() || null,
      });
      if (m) {
        toast.success("原稿を作成しました");
        setOpen(false);
        setCompany("");
        setDisplay("");
        router.push(`/${media.id}/${issueId}/edit/${m.id}`);
      } else {
        toast.error("作成に失敗しました");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteManuscript(id);
      toast.success("原稿を削除しました");
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">原稿 {manuscripts.length} 件</p>
        {signedIn && (
          <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              新規作成
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規原稿の作成</DialogTitle>
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
                  <Label>原稿種類</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {KIND_OPTIONS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKind(k)}
                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          kind === k
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        {KIND_LABELS[k]}
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
                  <Button onClick={create} disabled={pending || !size}>
                    {pending ? "作成中..." : "作成してエディタへ"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {manuscripts.length === 0 ? (
        <Card className={`p-10 text-center ${style.softBg}`}>
          <FileText className={`mx-auto h-10 w-10 ${style.text}`} />
          <p className="mt-3 font-medium">まだ原稿がありません</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {signedIn
              ? "「新規作成」からサイズを選んで作成してください。"
              : "編集には Google ログインが必要です。"}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {manuscripts.map((m) => (
            <Card key={m.id} className="flex items-center gap-3 p-3">
              <Link
                href={`/${media.id}/${issueId}/edit/${m.id}`}
                className="flex flex-1 items-center gap-3"
              >
                <Badge variant="secondary">{m.size}</Badge>
                {m.kind && m.kind !== "ad" && (
                  <Badge variant="outline">{KIND_LABELS[m.kind]}</Badge>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {m.display_name || m.company_name || "（未入力）"}
                  </p>
                  {m.company_name && m.display_name && (
                    <p className="truncate text-xs text-muted-foreground">
                      {m.company_name}
                    </p>
                  )}
                </div>
                <Badge variant={m.status === "done" ? "default" : "outline"}>
                  {m.status === "done" ? "完成" : "下書き"}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              {signedIn && (
                <button
                  type="button"
                  aria-label="削除"
                  onClick={() => remove(m.id)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
