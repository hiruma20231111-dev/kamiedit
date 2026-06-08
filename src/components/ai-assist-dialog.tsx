"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  GENRE_OPTIONS,
  TONE_OPTIONS,
  TARGET_OPTIONS,
  type FieldDef,
} from "@/lib/config/media";
import { getGeminiKey } from "@/lib/profile";
import { generateManuscript } from "@/lib/gemini";
import type { ThemeStyle } from "@/lib/theme";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? "" : o)}
          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
            value === o
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function AiAssistDialog({
  mediaName,
  sizeLabel,
  variantLabel,
  fields,
  style,
  initial,
  onApply,
}: {
  mediaName: string;
  sizeLabel: string;
  variantLabel?: string;
  fields: FieldDef[];
  style: ThemeStyle;
  initial?: { genre?: string; tone?: string; target?: string };
  onApply: (
    values: Record<string, string>,
    params: { genre: string; tone: string; target: string },
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [genre, setGenre] = useState(initial?.genre ?? "");
  const [tone, setTone] = useState(initial?.tone ?? "ミドル");
  const [target, setTarget] = useState(initial?.target ?? "");
  const [hearing, setHearing] = useState("");
  const [preview, setPreview] = useState<Record<string, string> | null>(null);

  function generate() {
    const key = getGeminiKey();
    if (!key) {
      toast.error("プロフィールで Gemini APIキーを設定してください");
      return;
    }
    if (!hearing.trim()) {
      toast.error("ヒアリング内容を入力してください");
      return;
    }
    startTransition(async () => {
      try {
        const result = await generateManuscript(key, {
          mediaName,
          sizeLabel,
          variantLabel,
          fields,
          genre: genre || undefined,
          tone: tone || undefined,
          target: target || undefined,
          hearing,
        });
        if (Object.keys(result).length === 0) {
          toast.error("生成結果が空でした。ヒアリング内容を増やしてお試しください");
          return;
        }
        setPreview(result);
        toast.success("生成しました。内容を確認して適用してください");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "生成に失敗しました");
      }
    });
  }

  function apply() {
    if (!preview) return;
    onApply(preview, { genre, tone, target });
    toast.success("フォームに反映しました");
    setOpen(false);
    setPreview(null);
  }

  const labelOf = (k: string) => fields.find((f) => f.key === k)?.label ?? k;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-sm font-medium transition-colors hover:bg-muted/50 ${style.border} ${style.text}`}
      >
        <Sparkles className="h-4 w-4" />
        ✨ AIに原稿を書いてもらう
      </button>

      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>✨ AIアシスト（{sizeLabel}）</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>ジャンル</Label>
            <Chips options={GENRE_OPTIONS} value={genre} onChange={setGenre} />
          </div>
          <div>
            <Label>トーン</Label>
            <Chips options={TONE_OPTIONS} value={tone} onChange={setTone} />
          </div>
          <div>
            <Label>ターゲット</Label>
            <Chips options={TARGET_OPTIONS} value={target} onChange={setTarget} />
          </div>

          <div>
            <Label htmlFor="hearing">ヒアリング内容（箇条書きでOK）</Label>
            <textarea
              id="hearing"
              value={hearing}
              onChange={(e) => setHearing(e.target.value)}
              rows={5}
              placeholder={"・店名／業種\n・ウリ、特徴、こだわり\n・キャンペーンや特典\n・伝えたい雰囲気 など"}
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              キーが未設定の場合は
              <Link href="/profile" className="mx-1 text-primary hover:underline">
                プロフィール
              </Link>
              で設定してください。
            </p>
          </div>

          {preview && (
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-semibold">生成結果プレビュー</p>
              <div className="space-y-2">
                {Object.entries(preview).map(([k, v]) => (
                  <div key={k} className="text-sm">
                    <span className="text-xs text-muted-foreground">
                      {labelOf(k)}
                    </span>
                    <p className="whitespace-pre-wrap rounded bg-muted/50 p-2">
                      {v}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={generate}
              disabled={pending}
            >
              <Sparkles className="h-4 w-4" />
              {pending ? "生成中..." : preview ? "再生成" : "生成する"}
            </Button>
            <Button onClick={apply} disabled={!preview}>
              適用する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
