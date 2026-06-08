"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { isLayoutPackage } from "@/lib/layout-transfer";
import { Upload } from "lucide-react";
import { toast } from "sonner";

/** 受け渡された割付ファイルを取り込んで新しい号を作るボタン */
export function ImportLayoutButton({ mediaId }: { mediaId: string }) {
  const router = useRouter();
  const importIssue = useStore((s) => s.importIssue);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  async function onFile(file: File) {
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast.error("ファイルを読み込めませんでした");
      return;
    }
    if (!isLayoutPackage(data)) {
      toast.error("kamiedit の割付ファイルではありません");
      return;
    }
    if (data.mediaId !== mediaId) {
      toast.error("別の媒体の割付ファイルです");
      return;
    }
    startTransition(async () => {
      const issue = await importIssue(data);
      if (issue) {
        toast.success("割付を取り込みました");
        router.push(`/${mediaId}/${issue.id}`);
      } else {
        toast.error("取り込みに失敗しました（ログイン状態をご確認ください）");
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        {pending ? "取り込み中..." : "割付を取り込む"}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}
