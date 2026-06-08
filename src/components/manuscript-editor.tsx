"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  resolveFormat,
  KIND_OPTIONS,
  KIND_LABELS,
  type MediaConfig,
  type FieldDef,
} from "@/lib/config/media";
import type { ManuscriptKind } from "@/lib/types";
import { THEME_STYLES } from "@/lib/theme";
import type { Manuscript } from "@/lib/types";
import { DriveImage } from "@/components/drive-image";
import { AiAssistDialog } from "@/components/ai-assist-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Upload,
  Trash2,
  Save,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

function CharGauge({ len, max }: { len: number; max?: number }) {
  if (!max) {
    return <span className="text-xs text-muted-foreground">{len}文字</span>;
  }
  const ratio = len / max;
  const over = len > max;
  const near = ratio >= 0.9 && !over;
  const color = over
    ? "bg-destructive"
    : near
      ? "bg-amber-500"
      : "bg-emerald-500";
  const textColor = over
    ? "text-destructive font-semibold"
    : near
      ? "text-amber-600"
      : "text-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
      <span className={`text-xs tabular-nums ${textColor}`}>
        {len}/{max}
      </span>
    </div>
  );
}

export function ManuscriptEditor({
  media,
  issueId,
  manuscript,
}: {
  media: MediaConfig;
  issueId: string;
  manuscript: Manuscript;
}) {
  const style = THEME_STYLES[media.theme];
  const router = useRouter();
  const updateManuscript = useStore((s) => s.updateManuscript);
  const uploadImage = useStore((s) => s.uploadImage);
  const deleteImage = useStore((s) => s.deleteImage);
  const saving = useStore((s) => s.saving);
  const allImages = useStore((s) => s.db.images);
  const images = allImages
    .filter((i) => i.manuscript_id === manuscript.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [variant, setVariant] = useState<string | null>(manuscript.variant);
  const [kind, setKind] = useState<ManuscriptKind>(manuscript.kind ?? "ad");
  const [genre, setGenre] = useState(manuscript.genre ?? "");
  const [tone, setTone] = useState(manuscript.tone ?? "");
  const [target, setTarget] = useState(manuscript.target ?? "");
  const [company, setCompany] = useState(manuscript.company_name ?? "");
  const [display, setDisplay] = useState(manuscript.display_name ?? "");
  const [remarks, setRemarks] = useState(manuscript.remarks ?? "");
  const [content, setContent] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [k, v] of Object.entries(manuscript.content ?? {})) {
      init[k] = typeof v === "string" ? v : String(v ?? "");
    }
    return init;
  });

  const format = resolveFormat(media, manuscript.size, variant);
  const fields: FieldDef[] = format?.fields ?? [];
  const imageCount = format?.imageCount ?? 0;
  const variants = format?.variants;
  const sizeLabel =
    media.sizes.find((s) => s.size === manuscript.size)?.label ?? manuscript.size;
  const variantLabel = variants?.find(
    (v) => v.id === (variant ?? variants[0]?.id),
  )?.label;

  function setField(key: string, value: string) {
    setContent((c) => ({ ...c, [key]: value }));
  }

  function save(markDone?: boolean) {
    startTransition(async () => {
      await updateManuscript(manuscript.id, {
        variant,
        kind,
        genre: genre || null,
        tone: tone || null,
        target: target || null,
        company_name: company.trim() || null,
        display_name: display.trim() || null,
        remarks: remarks.trim() || null,
        content,
        ...(markDone !== undefined
          ? { status: markDone ? "done" : "draft" }
          : {}),
      });
      toast.success(markDone ? "完成にしました" : "保存しました");
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (imageCount === 0) {
      toast.error("このサイズは写真を登録できません");
      return;
    }
    setUploading(true);
    let count = images.length;
    for (const f of Array.from(files)) {
      if (count >= imageCount) {
        toast.error(`写真は${imageCount}点までです`);
        break;
      }
      if (!f.type.startsWith("image/")) continue;
      const r = await uploadImage(manuscript.id, f);
      if (r) count++;
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <div className="mt-4">
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

        {variants && variants.length > 0 && (
          <div className="mt-4">
            <Label>パターン</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariant(v.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    (variant ?? variants[0].id) === v.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* AIアシスト */}
      <AiAssistDialog
        mediaName={media.name}
        sizeLabel={sizeLabel}
        variantLabel={variantLabel}
        fields={fields}
        style={style}
        initial={{ genre, tone, target }}
        onApply={(values, params) => {
          setContent((c) => ({ ...c, ...values }));
          setGenre(params.genre);
          setTone(params.tone);
          setTarget(params.target);
        }}
      />

      {/* 動的フォーム */}
      <Card className="p-5">
        <h3 className="mb-4 font-semibold">原稿項目（{manuscript.size}）</h3>
        <div className="space-y-5">
          {fields.map((f) => {
            const val = content[f.key] ?? "";
            return (
              <div key={f.key}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Label htmlFor={f.key}>
                    {f.label}
                    {f.required && <span className="ml-1 text-destructive">*</span>}
                  </Label>
                  <CharGauge len={val.length} max={f.maxLength} />
                </div>
                {f.type === "textarea" ? (
                  <textarea
                    id={f.key}
                    value={val}
                    onChange={(e) => setField(f.key, e.target.value)}
                    rows={3}
                    className={`w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                      f.maxLength && val.length > f.maxLength
                        ? "border-destructive"
                        : "border-input"
                    }`}
                  />
                ) : (
                  <Input
                    id={f.key}
                    value={val}
                    onChange={(e) => setField(f.key, e.target.value)}
                    aria-invalid={!!f.maxLength && val.length > f.maxLength}
                  />
                )}
                {f.hint && (
                  <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 画像 */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">写真</h3>
          <span className="text-xs text-muted-foreground">
            {imageCount === 0
              ? "このサイズは写真なし"
              : `${images.length}/${imageCount} 点`}
          </span>
        </div>

        {imageCount > 0 && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 text-sm transition-colors ${
              dragOver ? `${style.border} ${style.softBg}` : "border-input"
            }`}
          >
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-muted-foreground">
              {uploading
                ? "アップロード中…"
                : "ここに画像をドラッグ＆ドロップ、またはクリックして選択"}
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
        )}

        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((img) => (
              <div key={img.id} className="group relative">
                <DriveImage
                  fileId={img.storage_path}
                  alt={img.original_name ?? ""}
                  className="aspect-square w-full rounded-md object-cover"
                />
                <button
                  type="button"
                  aria-label="画像を削除"
                  onClick={() => void deleteImage(img.id)}
                  className="absolute right-1 top-1 rounded-md bg-background/80 p-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">
                  {img.original_name}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 備考 */}
      <Card className="p-5">
        <Label htmlFor="remarks">デザイナーへの指示（備考）</Label>
        <textarea
          id="remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          placeholder="レイアウトの希望、写真の配置、色味など"
          className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </Card>

      {/* アクション */}
      <div className="sticky bottom-4 flex items-center justify-end gap-2 rounded-lg border bg-background/90 p-3 backdrop-blur">
        {(saving || pending) && (
          <span className="mr-auto text-xs text-muted-foreground">保存中…</span>
        )}
        <Button variant="outline" onClick={() => router.push(`/${media.id}/${issueId}`)}>
          一覧へ戻る
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => save(manuscript.status !== "done")}
        >
          <CheckCircle2 className="h-4 w-4" />
          {manuscript.status === "done" ? "下書きに戻す" : "完成にする"}
        </Button>
        <Button disabled={pending} onClick={() => save()}>
          <Save className="h-4 w-4" />
          保存
        </Button>
      </div>
    </div>
  );
}
