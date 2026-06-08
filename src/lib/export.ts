/**
 * デザイナー向けエクスポート。
 *  - 指示書: 整形したHTMLを別ウィンドウで開き、ブラウザの印刷→PDF保存に渡す（日本語フォント問題を回避）
 *  - 写真ZIP: Drive から画像を取得し、「号数_ページ_枠番号_店舗名_n.jpg」にリネームしてZIP化
 */
import JSZip from "jszip";
import type { Manuscript, ManuscriptImage, LayoutSlot, Issue } from "@/lib/types";
import { resolveFormat, KIND_LABELS, type MediaConfig } from "@/lib/config/media";
import { downloadFile } from "@/lib/google/drive";

export interface ExportCtx {
  media: MediaConfig;
  issue: Issue;
  slots: LayoutSlot[];
}

function safe(s: string | null | undefined): string {
  const t = (s ?? "").replace(/[\\/:*?"<>|\n\r]/g, "").trim();
  return t || "無題";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

/** まみたんは割付の枠からページ・枠番号を解決 */
function locate(m: Manuscript, ctx: ExportCtx): { page: number | null; frame: number | null } {
  if (ctx.media.hasLayout) {
    const slot = ctx.slots.find((s) => s.manuscript_id === m.id);
    if (slot) return { page: slot.page_no, frame: slot.position + 1 };
  }
  return { page: null, frame: null };
}

/** 指示書HTMLを生成 */
export function buildInstructionHtml(
  manuscripts: Manuscript[],
  images: ManuscriptImage[],
  ctx: ExportCtx,
): string {
  const sections = manuscripts
    .map((m) => {
      const fmt = resolveFormat(ctx.media, m.size, m.variant);
      const loc = locate(m, ctx);
      const content = (m.content ?? {}) as Record<string, unknown>;
      const fieldRows = (fmt?.fields ?? [])
        .map((f) => {
          const v = content[f.key];
          if (v === undefined || v === null || String(v).trim() === "") return "";
          return `<tr><th>${esc(f.label)}</th><td>${esc(String(v))}</td></tr>`;
        })
        .join("");
      const imgs = images
        .filter((i) => i.manuscript_id === m.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      const imgList = imgs.length
        ? `<div class="imgs"><b>写真(${imgs.length})</b>: ${imgs
            .map((i) => esc(i.original_name ?? ""))
            .join(" / ")}</div>`
        : "";
      const locStr =
        loc.page != null ? `P${loc.page} / 枠${loc.frame}` : "—";

      return `<section>
        <div class="head">
          <span class="size">${esc(m.size)}${m.variant ? `（${esc(m.variant)}）` : ""}</span>
          ${m.kind && m.kind !== "ad" ? `<span class="kind">${esc(KIND_LABELS[m.kind])}</span>` : ""}
          <span class="name">${esc(m.display_name || m.company_name || "（未入力）")}</span>
          <span class="loc">${locStr}</span>
        </div>
        <table>${fieldRows || '<tr><td class="empty">（未入力）</td></tr>'}</table>
        ${m.remarks ? `<div class="remarks"><b>備考</b><br>${esc(m.remarks)}</div>` : ""}
        ${imgList}
      </section>`;
    })
    .join("");

  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
  <title>${esc(ctx.media.name)} ${esc(ctx.issue.name)} 指示書</title>
  <style>
    body{font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:#111;margin:24px;font-size:13px;}
    h1{font-size:18px;margin:0 0 4px;}
    .sub{color:#666;margin:0 0 16px;font-size:12px;}
    section{border:1px solid #ccc;border-radius:8px;padding:12px 14px;margin-bottom:14px;page-break-inside:avoid;}
    .head{display:flex;gap:12px;align-items:baseline;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:6px;}
    .size{background:#111;color:#fff;border-radius:4px;padding:2px 8px;font-size:12px;}
    .kind{background:#eef;color:#33c;border:1px solid #ccd;border-radius:4px;padding:2px 6px;font-size:11px;}
    .name{font-weight:700;font-size:15px;}
    .loc{margin-left:auto;color:#666;font-size:12px;}
    table{width:100%;border-collapse:collapse;}
    th{text-align:left;width:140px;vertical-align:top;color:#555;font-weight:600;padding:3px 8px 3px 0;border-bottom:1px solid #f0f0f0;}
    td{padding:3px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;}
    td.empty{color:#aaa;}
    .remarks{margin-top:8px;background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:8px;}
    .imgs{margin-top:8px;color:#444;font-size:12px;}
    @media print{body{margin:12mm;} .noprint{display:none;}}
  </style></head>
  <body>
    <h1>${esc(ctx.media.name)} ${esc(ctx.issue.name)} 入稿指示書</h1>
    <p class="sub">原稿 ${manuscripts.length} 件 / 出力日: ${new Date().toLocaleString("ja-JP")}</p>
    ${sections || "<p>原稿がありません。</p>"}
  </body></html>`;
}

/** 指示書を別ウィンドウで開いて印刷（→PDF保存）に渡す */
export function printInstruction(html: string): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  // 描画待ちしてから印刷
  setTimeout(() => {
    try {
      w.print();
    } catch {
      // ユーザーが手動印刷できるよう開いたままにする
    }
  }, 400);
  return true;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 写真をZIP化してダウンロード。リネーム規則: 号数_Pページ_枠番号_店舗名_n.ext */
export async function exportPhotosZip(
  manuscripts: Manuscript[],
  images: ManuscriptImage[],
  ctx: ExportCtx,
  token: string,
): Promise<number> {
  const zip = new JSZip();
  let total = 0;
  let seq = 0;

  for (const m of manuscripts) {
    const loc = locate(m, ctx);
    const imgs = images
      .filter((i) => i.manuscript_id === m.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    let n = 0;
    for (const img of imgs) {
      const blob = await downloadFile(token, img.storage_path);
      const ext = img.original_name?.includes(".")
        ? img.original_name.split(".").pop()
        : "jpg";
      const page = loc.page != null ? `P${loc.page}` : "P-";
      const frame = loc.frame != null ? loc.frame : ++seq;
      const store = safe(m.display_name || m.company_name);
      n++;
      const name = `${safe(ctx.issue.name)}_${page}_${frame}_${store}_${n}.${ext}`;
      zip.file(name, blob);
      total++;
    }
  }

  if (total === 0) return 0;
  const out = await zip.generateAsync({ type: "blob" });
  triggerDownload(out, `${safe(ctx.issue.name)}_写真.zip`);
  return total;
}
