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

/** content から指定キーの値を取得（trim 済み） */
function val(attack: AttackManuscript, key: string): string {
  return (attack.content?.[key] ?? "").toString().trim();
}

/**
 * DOMOぱど（求人）専用レイアウト。実誌面の求人広告体裁に寄せる:
 * カラー帯ヘッダー → ★アピール → 【募集要項】■ラベル行 → お問い合わせ枠。
 */
function buildDomoBody(attack: AttackManuscript, sizeLabel: string): string {
  const jobTitle = val(attack, "job_title") || "（職種）";
  const employment = val(attack, "employment");
  const company = val(attack, "company");

  // 募集要項ボックスに並べる項目（職種・雇用形態・企業名はヘッダー/フッターに出すので除外）
  const reqKeys: [string, string][] = [
    ["salary", "給与"],
    ["work_hours", "勤務時間"],
    ["work_place", "勤務地"],
    ["holiday", "休日・休暇"],
    ["qualification", "資格・歓迎"],
    ["benefits", "待遇・福利厚生"],
    ["how_to_apply", "応募方法"],
  ];
  const reqItems = reqKeys
    .map(([key, label]) => {
      const v = val(attack, key);
      if (!v) return "";
      return `<li><span class="rq-l">${esc(label)}</span><span class="rq-v">${esc(v)}</span></li>`;
    })
    .filter(Boolean)
    .join("");

  const appeal = attack.free_text?.trim()
    ? `<div class="domo-appeal">${esc(attack.free_text.trim())}</div>`
    : "";

  const photo = attack.photos?.[0]
    ? `<div class="domo-photo"><img src="${attack.photos[0]}" alt=""></div>`
    : "";

  return `
  <div class="domo">
    <div class="domo-band">
      <div class="domo-band-main">
        <span class="domo-job">${esc(jobTitle)}</span>
        ${employment ? `<span class="domo-emp">${esc(employment)}</span>` : ""}
      </div>
      <span class="domo-size">${esc(sizeLabel)}</span>
    </div>

    <div class="domo-body">
      <div class="domo-col">
        ${appeal}
        <div class="domo-req">
          <div class="domo-req-h">【募集要項】</div>
          <ul>${reqItems || '<li><span class="empty">要項を入力してください</span></li>'}</ul>
        </div>
      </div>
      ${photo}
    </div>

    <div class="domo-contact">
      <span class="domo-contact-l">お問い合わせ</span>
      <span class="domo-contact-v">${company ? esc(company) : '<span class="empty">企業名・連絡先</span>'}</span>
    </div>
  </div>`;
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

  // DOMOぱど（求人）は実誌面体裁の専用レイアウト。それ以外（まみたん/家庭版ぱど）は販促レイアウト。
  const body = format.hasFreeArea
    ? buildDomoBody(attack, sizeLabel)
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
    /* ── DOMO求人 実誌面体裁 ── */
    .domo{border:2px solid var(--accent);border-radius:8px;overflow:hidden;}
    .domo-band{background:var(--accent);color:#fff;padding:10px 14px;display:flex;align-items:center;gap:10px;}
    .domo-band-main{display:flex;align-items:baseline;gap:10px;flex:1;min-width:0;}
    .domo-job{font-size:20px;font-weight:800;letter-spacing:.02em;}
    .domo-emp{font-size:12px;background:rgba(255,255,255,.25);border-radius:4px;padding:2px 8px;white-space:nowrap;}
    .domo-size{font-size:12px;font-weight:700;border:1px solid rgba(255,255,255,.6);border-radius:4px;padding:2px 8px;white-space:nowrap;}
    .domo-body{display:flex;gap:14px;padding:14px;}
    .domo-col{flex:1;min-width:0;}
    .domo-appeal{background:#fff7ed;border:1px solid var(--accent);border-radius:6px;color:#9a3412;font-weight:700;line-height:1.6;padding:10px 12px;margin-bottom:12px;white-space:pre-wrap;}
    .domo-req-h{font-weight:800;color:var(--accent);margin-bottom:6px;font-size:14px;}
    .domo-req ul{list-style:none;margin:0;padding:0;border-top:2px solid var(--accent);}
    .domo-req li{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #eee;line-height:1.6;}
    .domo-req .rq-l{flex:0 0 86px;font-weight:700;color:#333;position:relative;padding-left:14px;}
    .domo-req .rq-l::before{content:"";position:absolute;left:0;top:.5em;width:7px;height:7px;background:var(--accent);}
    .domo-req .rq-v{flex:1;white-space:pre-wrap;}
    .domo-photo{flex:0 0 150px;}
    .domo-photo img{width:150px;height:150px;object-fit:cover;border-radius:6px;border:1px solid #ddd;}
    .domo-contact{display:flex;align-items:center;gap:10px;background:#fff7ed;border-top:2px solid var(--accent);padding:10px 14px;}
    .domo-contact-l{font-weight:800;color:var(--accent);white-space:nowrap;}
    .domo-contact-l::before{content:"☎ ";}
    .domo-contact-v{font-weight:700;white-space:pre-wrap;}
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
