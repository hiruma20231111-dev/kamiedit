/**
 * アタック原稿のPDF出力（指示書と同じく、整形HTMLを別ウィンドウで開いて印刷→PDF保存）。
 * ※体裁はv1の概算。実物の誌面を見て今後寄せていく。
 */
import type { MediaConfig, ThemeColor } from "@/lib/config/media";
import type { AttackFormat } from "@/lib/config/attack";
import type { AttackManuscript } from "@/lib/types";
import { printInstruction } from "@/lib/export";

const ACCENT: Record<ThemeColor, string> = {
  pink: "#db2777",
  blue: "#2563eb",
  orange: "#ea580c",
  green: "#16a34a",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function reqRows(attack: AttackManuscript, format: AttackFormat): string {
  return format.fields
    .map((f) => {
      const v = (attack.content?.[f.key] ?? "").toString().trim();
      return `<tr><th>${esc(f.label)}</th><td>${v ? esc(v) : '<span class="empty">—</span>'}</td></tr>`;
    })
    .join("");
}

function photosHtml(attack: AttackManuscript): string {
  if (!attack.photos?.length) return "";
  return `<div class="photos">${attack.photos
    .map((src) => `<img src="${src}" alt="">`)
    .join("")}</div>`;
}

/** アタック原稿1件のHTMLを生成 */
export function buildAttackHtml(
  attack: AttackManuscript,
  media: MediaConfig,
  format: AttackFormat,
): string {
  const accent = ACCENT[media.theme];
  const title = esc(attack.title || "（クライアント名）");
  const sizeLabel =
    format.sizes.find((s) => s.size === attack.size)?.label ?? attack.size;

  // DOMOぱど等：左=要項 / 右=フリーPR＋写真
  const body = format.hasFreeArea
    ? `<div class="cols">
        <div class="col-left">
          <h2>募集要項</h2>
          <table>${reqRows(attack, format)}</table>
        </div>
        <div class="col-right">
          <h2>${esc(format.freeLabel ?? "フリー欄")}</h2>
          <div class="free">${attack.free_text ? esc(attack.free_text) : '<span class="empty">（フリー欄は未作成）</span>'}</div>
          ${photosHtml(attack)}
        </div>
      </div>`
    : `<div class="promo">
        <div class="catch">${esc(attack.content?.catch || "キャッチコピー")}</div>
        ${photosHtml(attack)}
        ${attack.content?.body ? `<p class="lead">${esc(attack.content.body)}</p>` : ""}
        <table>${reqRows(attack, format)}</table>
      </div>`;

  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
  <title>${esc(media.name)} アタック原稿 ${title}</title>
  <style>
    :root{ --accent:${accent}; }
    body{font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:#111;margin:0;padding:24px;font-size:13px;}
    .sheet{max-width:760px;margin:0 auto;border:2px solid var(--accent);border-radius:10px;overflow:hidden;}
    .head{background:var(--accent);color:#fff;padding:12px 18px;display:flex;align-items:baseline;gap:10px;}
    .head .media{font-size:18px;font-weight:800;}
    .head .size{background:rgba(255,255,255,.25);border-radius:4px;padding:2px 8px;font-size:12px;}
    .head .title{margin-left:auto;font-size:14px;font-weight:700;}
    .head .tag{font-size:11px;opacity:.9;}
    .inner{padding:18px;}
    h2{font-size:13px;color:var(--accent);border-bottom:2px solid var(--accent);padding-bottom:4px;margin:0 0 8px;}
    .cols{display:flex;gap:16px;}
    .col-left{flex:1;} .col-right{flex:1;}
    table{width:100%;border-collapse:collapse;}
    th{text-align:left;width:96px;vertical-align:top;color:#555;font-weight:600;padding:5px 8px 5px 0;border-bottom:1px solid #eee;font-size:12px;}
    td{padding:5px 0;border-bottom:1px solid #eee;vertical-align:top;}
    .empty{color:#bbb;}
    .free{white-space:pre-wrap;line-height:1.7;background:#fafafa;border:1px solid #eee;border-radius:6px;padding:10px;min-height:80px;}
    .promo .catch{font-size:20px;font-weight:800;color:var(--accent);margin-bottom:10px;line-height:1.4;}
    .promo .lead{line-height:1.7;margin:8px 0 12px;}
    .photos{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;}
    .photos img{width:140px;height:140px;object-fit:cover;border-radius:6px;border:1px solid #ddd;}
    .foot{padding:8px 18px;color:#888;font-size:11px;border-top:1px dashed #ddd;}
    @media print{ body{padding:0;} .sheet{border:none;} }
  </style></head>
  <body>
    <div class="sheet">
      <div class="head">
        <span class="media">${esc(media.name)}</span>
        <span class="size">${esc(sizeLabel)}</span>
        <span class="tag">アタック原稿（提案イメージ）</span>
        <span class="title">${title}</span>
      </div>
      <div class="inner">${body}</div>
      <div class="foot">※本紙はクライアント提案用の仮イメージです。出力日: ${new Date().toLocaleString("ja-JP")}</div>
    </div>
  </body></html>`;
}

/** アタック原稿を別ウィンドウで開いて印刷（→PDF保存）に渡す */
export function printAttack(
  attack: AttackManuscript,
  media: MediaConfig,
  format: AttackFormat,
): boolean {
  return printInstruction(buildAttackHtml(attack, media, format));
}
