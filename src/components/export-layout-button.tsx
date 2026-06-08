"use client";

import { useStore } from "@/lib/store";
import { safeFileName } from "@/lib/layout-transfer";
import { Download } from "lucide-react";
import { toast } from "sonner";

/** 割付を受け渡し用ファイルに書き出すボタン（校正担当などへ渡す用） */
export function ExportLayoutButton({ issueId }: { issueId: string }) {
  const exportIssue = useStore((s) => s.exportIssue);

  function onExport() {
    const pkg = exportIssue(issueId);
    if (!pkg) {
      toast.error("書き出しに失敗しました");
      return;
    }
    const blob = new Blob([JSON.stringify(pkg, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName(pkg.issueName)}_割付.kamiedit.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("割付を書き出しました。校正担当に渡せます");
  }

  return (
    <button
      type="button"
      onClick={onExport}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/40 bg-white/15 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/25"
    >
      <Download className="h-4 w-4" />
      割付を書き出す
    </button>
  );
}
