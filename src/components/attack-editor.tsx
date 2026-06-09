"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import type { MediaConfig } from "@/lib/config/media";
import { ATTACK_FORMATS } from "@/lib/config/attack";
import type { AttackManuscript } from "@/lib/types";
import { THEME_STYLES } from "@/lib/theme";
import { getGeminiKey } from "@/lib/profile";
import { generateAttackFreeText } from "@/lib/gemini";
import { printAttack } from "@/lib/attack-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Upload, Trash2, Save, Sparkles, FileDown, X } from "lucide-react";
import { toast } from "sonner";

/** 画像を縮小して dataURL 化（DBに直接保存するためサイズを抑える） */
function fileToDataUrl(file: File, maxDim = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas未対応"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました"));
    };
    img.src = url;
  });
}

export function AttackEditor({
  media,
  attack,
}: {
  media: MediaConfig;
  attack: AttackManuscript;
}) {
  const style = THEME_STYLES[media.theme];
  const router = useRouter();
  const format = ATTACK_FORMATS[media.id];
  const updateAttack = useStore((s) => s.updateAttack);
  const deleteAttack = useStore((s) => s.deleteAttack);
  const saving = useStore((s) => s.saving);
  const [pending, startTransition] = useTransition();
  const [aiPending, startAi] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(attack.title ?? "");
  const [content, setContent] = useState<Record<string, string>>(() => ({
    ...attack.content,
  }));
  const [freeText, setFreeText] = useState(attack.free_text ?? "");
  const [photos, setPhotos] = useState<string[]>(attack.photos ?? []);

  const sizeLabel =
    format.sizes.find((s) => s.size === attack.size)?.label ?? attack.size;

  function setField(key: string, value: string) {
    setContent((c) => ({ ...c, [key]: value }));
  }

  /** 現在の編集状態を AttackManuscript にまとめる */
  function current(): AttackManuscript {
    return {
      ...attack,
      title: title.trim() || null,
      content,
      free_text: freeText.trim() || null,
      photos,
    };
  }

  function save(thenExport = false) {
    startTransition(async () => {
      await updateAttack(attack.id, {
        title: title.trim() || null,
        content,
        free_text: freeText.trim() || null,
        photos,
      });
      toast.success("保存しました");
      if (thenExport) doExport();
    });
  }

  function doExport() {
    const ok = printAttack(current(), media, format);
    if (!ok) toast.error("ポップアップがブロックされました。許可してください");
  }

  function remove() {
    startTransition(async () => {
      await deleteAttack(attack.id);
      toast.success("削除しました");
      router.push(`/${media.id}`);
    });
  }

  function generateFree() {
    const key = getGeminiKey();
    if (!key) {
      toast.error("プロフィールで Gemini APIキーを設定してください");
      return;
    }
    startAi(async () => {
      try {
        const text = await generateAttackFreeText(key, {
          mediaName: media.name,
          requirements: format.fields.map((f) => ({
            label: f.label,
            value: content[f.key] ?? "",
          })),
          maxLength: format.freeMaxLength ?? 220,
        });
        if (!text) {
          toast.error("生成結果が空でした。要項を埋めてお試しください");
          return;
        }
        setFreeText(text);
        toast.success("フリー欄を生成しました。内容を調整できます");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "生成に失敗しました");
      }
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    let room = format.maxPhotos - photos.length;
    if (room <= 0) {
      toast.error(`仮写真は${format.maxPhotos}点までです`);
      return;
    }
    const added: string[] = [];
    for (const f of Array.from(files)) {
      if (room <= 0) break;
      if (!f.type.startsWith("image/")) continue;
      try {
        added.push(await fileToDataUrl(f));
        room--;
      } catch {
        // skip
      }
    }
    if (added.length) setPhotos((p) => [...p, ...added]);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="title">クライアント名 / タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="株式会社○○ / ○○店"
            />
          </div>
          <div className="flex items-end">
            <span className="text-sm text-muted-foreground">
              サイズ：{sizeLabel}
            </span>
          </div>
        </div>
      </Card>

      {/* 要項/項目 */}
      <Card className="p-5">
        <h3 className="mb-4 font-semibold">
          {format.hasFreeArea ? "募集要項" : "原稿項目"}
        </h3>
        <div className="space-y-4">
          {format.fields.map((f) => {
            const val = content[f.key] ?? "";
            return (
              <div key={f.key}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Label htmlFor={f.key}>
                    {f.label}
                    {f.required && <span className="ml-1 text-destructive">*</span>}
                  </Label>
                  {f.maxLength && (
                    <span
                      className={`text-xs tabular-nums ${val.length > f.maxLength ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {val.length}/{f.maxLength}
                    </span>
                  )}
                </div>
                {f.type === "textarea" ? (
                  <textarea
                    id={f.key}
                    value={val}
                    onChange={(e) => setField(f.key, e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                ) : (
                  <Input
                    id={f.key}
                    value={val}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* DOMO等：右フリー欄（AI生成） */}
      {format.hasFreeArea && (
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">{format.freeLabel ?? "フリー欄"}</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={generateFree}
              disabled={aiPending}
            >
              <Sparkles className="h-4 w-4" />
              {aiPending ? "生成中..." : "要項からAI生成"}
            </Button>
          </div>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={6}
            placeholder="左の要項を埋めて「要項からAI生成」を押すと、雰囲気に合うPR文を作成します。生成後の手直しも可能です。"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            キー未設定の場合は
            <Link href="/profile" className="mx-1 text-primary hover:underline">
              プロフィール
            </Link>
            で Gemini APIキーを設定してください。
          </p>
        </Card>
      )}

      {/* 仮写真 */}
      {format.maxPhotos > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">仮写真</h3>
            <span className="text-xs text-muted-foreground">
              {photos.length}/{format.maxPhotos} 点
            </span>
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-6 text-sm transition-colors ${style.border} hover:${style.softBg}`}
          >
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-muted-foreground">
              クリックして仮写真を選択（提案イメージ用）
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </div>
          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((src, i) => (
                <div key={i} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="aspect-square w-full rounded-md object-cover"
                  />
                  <button
                    type="button"
                    aria-label="写真を削除"
                    onClick={() =>
                      setPhotos((p) => p.filter((_, idx) => idx !== i))
                    }
                    className="absolute right-1 top-1 rounded-md bg-background/80 p-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* アクション */}
      <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-2 rounded-lg border bg-background/90 p-3 backdrop-blur">
        {(saving || pending) && (
          <span className="mr-auto text-xs text-muted-foreground">保存中…</span>
        )}
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={remove}
          disabled={pending}
        >
          <Trash2 className="h-4 w-4" />
          削除
        </Button>
        <Button variant="outline" onClick={() => router.push(`/${media.id}`)}>
          一覧へ戻る
        </Button>
        <Button variant="outline" onClick={() => save(true)} disabled={pending}>
          <FileDown className="h-4 w-4" />
          保存してPDF出力
        </Button>
        <Button onClick={() => save()} disabled={pending}>
          <Save className="h-4 w-4" />
          保存
        </Button>
      </div>
    </div>
  );
}
