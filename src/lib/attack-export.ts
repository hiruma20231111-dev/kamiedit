/**
 * アタック原稿のPDF出力（整形HTMLを別ウィンドウで開いて印刷→PDF保存）。
 *
 * DOMOぱど（求人）は発行元「求人広告の見方」の実誌面体裁を忠実に再現する:
 *   カラー帯ヘッダー（エリア区分 + 就業形態/PRマーク + QR）→ 職種行 → 給与帯
 *   → 赤キャッチ →【募集情報】■ →【職場情報】■ → 写真 → 連絡先 → 会社名。
 * 1/4=単一カラム・コンパクト / 1/2=二段（本文＋写真）。
 * 参考: secretary/media/.../domo-ad-anatomy.md
 */
import type { MediaConfig, ThemeColor } from "@/lib/config/media";
import {
  type AttackFormat,
  EMPLOYMENT_OPTIONS,
  PR_MARK_OPTIONS,
} from "@/lib/config/attack";
import type { AttackManuscript } from "@/lib/types";
import { printInstruction } from "@/lib/export";

const ACCENT: Record<ThemeColor, string> = {
  pink: "#db2777",
  blue: "#2563eb",
  orange: "#ea580c",
  green: "#16a34a",
};

/** DOMO求人広告の基調色（実誌面は赤が基本） */
const DOMO_RED = "#e60012";

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

/** content から指定キーの値を取得（trim 済み） */
function val(attack: AttackManuscript, key: string): string {
  return (attack.content?.[key] ?? "").toString().trim();
}

// ───────────────────────── DOMO（求人）実誌面体裁 ─────────────────────────

/** ❶就業形態マークを解決 */
function employmentMark(value: string) {
  return EMPLOYMENT_OPTIONS.find((o) => o.value === value) ?? null;
}

/** ❸PRマーク（カンマ区切り value）を解決 */
function prMarks(csv: string) {
  if (!csv) return [];
  const set = csv.split(",").filter(Boolean);
  return PR_MARK_OPTIONS.filter((o) => set.includes(o.value));
}

/** ❺QR: 画像があれば img、無ければ空枠 */
function qrHtml(attack: AttackManuscript): string {
  const qr = val(attack, "qr");
  return qr
    ? `<div class="ad-qr"><img src="${qr}" alt="QR"></div>`
    : `<div class="ad-qr empty">QR</div>`;
}

/** ❹募集情報の■行（空欄は出さない） */
function reqList(attack: AttackManuscript): string {
  const keys: string[] = [
    "job_content",
    "work_hours",
    "holiday",
    "qualification",
    "treatment",
    "how_to_apply",
  ];
  const items = keys
    .map((k) => val(attack, k))
    .filter(Boolean)
    .map((v) => `<li>${esc(v)}</li>`)
    .join("");
  return items
    ? `<div class="ad-sec">【募集情報】</div><ul class="ad-list">${items}</ul>`
    : "";
}

/** 【職場情報】（業種 + 先輩から） */
function workplaceHtml(attack: AttackManuscript): string {
  const type = val(attack, "workplace_type");
  const senpai = val(attack, "senpai");
  if (!type && !senpai) return "";
  const typeLi = type ? `<li>${esc(type)}</li>` : "";
  const senpaiHtml = senpai
    ? `<p class="ad-senpai">《先輩から》${esc(senpai)}</p>`
    : "";
  return `<div class="ad-sec">【職場情報】</div><ul class="ad-list">${typeLi}</ul>${senpaiHtml}`;
}

function photosCol(attack: AttackManuscript): string {
  if (!attack.photos?.length) return "";
  return `<div class="ad-photos">${attack.photos
    .map((src) => `<img src="${src}" alt="">`)
    .join("")}</div>`;
}

/** DOMO求人広告のHTML（size: "1/4" | "1/2"） */
function buildDomoAd(attack: AttackManuscript, size: string): string {
  const emp = employmentMark(val(attack, "employment"));
  const marks = prMarks(val(attack, "pr_marks"));
  const area = val(attack, "area");
  const jobTitle = val(attack, "job_title") || "（職種・見出し）";
  const salary = val(attack, "salary");
  const company = val(attack, "company") || "（会社名・店名）";
  const address = val(attack, "address");
  const tel = val(attack, "tel");
  const person = val(attack, "contact_person");

  const empBadge = emp
    ? `<span class="emp-mark" title="${esc(emp.label)}">${esc(emp.mark ?? "")}</span>`
    : "";
  const prBadges = marks
    .map(
      (m) =>
        `<span class="pr-mark" title="${esc(m.label)}">${esc(m.mark ?? "")}</span>`,
    )
    .join("");

  const catch_ = attack.free_text?.trim()
    ? `<div class="ad-catch">${esc(attack.free_text.trim())}</div>`
    : "";

  const contactParts = [
    address ? `〒${esc(address)}` : "",
    tel ? `☎${esc(tel)}` : "",
    person ? `担当/${esc(person)}` : "",
  ]
    .filter(Boolean)
    .join("　");

  const isHalf = size === "1/2";

  // 本文: 1/2 は二段（左=募集情報 / 右=写真+職場情報）、1/4 は単一カラム
  const main = isHalf
    ? `<div class="ad-cols">
         <div class="ad-col-l">${reqList(attack)}</div>
         <div class="ad-col-r">${photosCol(attack)}${workplaceHtml(attack)}</div>
       </div>`
    : `${reqList(attack)}${workplaceHtml(attack)}${photosCol(attack)}`;

  return `
  <div class="ad ${isHalf ? "h2" : "q4"}">
    <div class="ad-head">
      <div class="ad-area">${area ? esc(area) : "勤務地"}</div>
      <div class="ad-head-r">
        <div class="ad-marks">${empBadge}${prBadges}</div>
        ${qrHtml(attack)}
      </div>
    </div>
    <div class="ad-job">${empBadge ? `<span class="emp-mark">${esc(emp?.mark ?? "")}</span>` : ""}<span class="job-name">${esc(jobTitle)}</span></div>
    ${salary ? `<div class="ad-salary">${esc(salary)}</div>` : ""}
    ${catch_}
    <div class="ad-main">${main}</div>
    <div class="ad-contact">${contactParts || "〒住所　☎TEL　担当/◯◯"}</div>
    <div class="ad-company">${esc(company)}</div>
  </div>`;
}

/** DOMO用スタイル */
function domoStyle(): string {
  return `
    :root{ --red:${DOMO_RED}; }
    body{font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:#111;margin:0;padding:20px;background:#fff;}
    .proposal-note{max-width:760px;margin:0 auto 10px;font-size:11px;color:#888;}
    .ad{margin:0 auto;border:3px solid var(--red);background:#fff;color:#111;}
    .ad.q4{max-width:360px;font-size:12px;}
    .ad.h2{max-width:720px;font-size:13px;}
    /* ヘッダー帯 */
    .ad-head{background:var(--red);color:#fff;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:6px 8px;}
    .ad-area{background:#fff;color:var(--red);font-weight:800;border-radius:3px;padding:2px 8px;font-size:.95em;align-self:flex-start;}
    .ad-head-r{display:flex;align-items:flex-start;gap:6px;}
    .ad-marks{display:flex;flex-wrap:wrap;gap:3px;justify-content:flex-end;max-width:180px;}
    .pr-mark{background:#fff;color:var(--red);border:1px solid var(--red);font-weight:800;font-size:10px;line-height:1;padding:3px 4px;border-radius:2px;min-width:16px;text-align:center;}
    .emp-mark{background:#ffe100;color:#111;font-weight:800;font-size:11px;line-height:1;padding:3px 5px;border-radius:2px;}
    .ad-qr{width:52px;height:52px;flex:0 0 52px;background:#fff;border:1px solid #fff;display:flex;align-items:center;justify-content:center;overflow:hidden;}
    .ad-qr img{width:100%;height:100%;object-fit:contain;}
    .ad-qr.empty{color:#bbb;font-size:11px;border:1px dashed #ccc;}
    /* 職種行・給与帯 */
    .ad-job{display:flex;align-items:center;gap:6px;padding:6px 8px;background:#fff3cd;border-bottom:1px solid var(--red);}
    .ad-job .job-name{font-size:1.35em;font-weight:800;color:#111;}
    .ad-salary{background:var(--red);color:#fff;font-weight:800;padding:4px 8px;font-size:1.05em;}
    /* キャッチ */
    .ad-catch{color:var(--red);font-weight:800;text-align:center;line-height:1.5;padding:8px;white-space:pre-wrap;border-bottom:1px dashed var(--red);}
    /* 本文 */
    .ad-main{padding:8px;}
    .ad-cols{display:flex;gap:10px;}
    .ad-col-l{flex:1.3;min-width:0;}
    .ad-col-r{flex:1;min-width:0;}
    .ad-sec{color:var(--red);font-weight:800;border-top:1px solid var(--red);margin-top:6px;padding-top:3px;}
    .ad-list{list-style:none;margin:4px 0;padding:0;}
    .ad-list li{position:relative;padding:3px 0 3px 14px;line-height:1.55;border-bottom:1px dotted #ddd;}
    .ad-list li::before{content:"";position:absolute;left:0;top:.6em;width:8px;height:8px;background:var(--red);}
    .ad-senpai{margin:4px 0;line-height:1.6;font-size:.95em;}
    .ad-photos{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
    .ad-photos img{width:100%;max-width:200px;height:auto;border:1px solid #ccc;}
    .ad.q4 .ad-photos img{max-width:140px;}
    /* 連絡先・会社名 */
    .ad-contact{padding:5px 8px;font-size:.95em;border-top:1px solid var(--red);line-height:1.5;}
    .ad-company{padding:4px 8px 8px;font-weight:800;color:var(--red);font-size:1.1em;}
    @media print{ body{padding:0;} .proposal-note{display:none;} }`;
}

/** DOMOぱど（求人）アタック原稿の完全HTML */
function buildDomoDocument(
  attack: AttackManuscript,
  media: MediaConfig,
  format: AttackFormat,
): string {
  const sizeLabel =
    format.sizes.find((s) => s.size === attack.size)?.label ?? attack.size;
  const title = attack.title ? `（${esc(attack.title)}）` : "";
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
  <title>${esc(media.name)} アタック原稿 ${esc(attack.title ?? "")}</title>
  <style>${domoStyle()}</style></head>
  <body>
    <div class="proposal-note">${esc(media.name)}・アタック原稿（提案イメージ） ${esc(sizeLabel)}${title}</div>
    ${buildDomoAd(attack, attack.size)}
  </body></html>`;
}

// ───────────────────────── 販促（まみたん/家庭版ぱど） ─────────────────────────

/** アタック原稿1件のHTMLを生成 */
export function buildAttackHtml(
  attack: AttackManuscript,
  media: MediaConfig,
  format: AttackFormat,
): string {
  // DOMOぱど（求人）は実誌面体裁の専用ドキュメント
  if (format.hasFreeArea) {
    return buildDomoDocument(attack, media, format);
  }

  const accent = ACCENT[media.theme];
  const title = esc(attack.title || "（クライアント名）");
  const sizeLabel =
    format.sizes.find((s) => s.size === attack.size)?.label ?? attack.size;

  // まみたん/家庭版ぱど（販促）
  const body = `<div class="promo">
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
    table{width:100%;border-collapse:collapse;}
    th{text-align:left;width:96px;vertical-align:top;color:#555;font-weight:600;padding:5px 8px 5px 0;border-bottom:1px solid #eee;font-size:12px;}
    td{padding:5px 0;border-bottom:1px solid #eee;vertical-align:top;}
    .empty{color:#bbb;}
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
