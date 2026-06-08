/**
 * Google Gemini API 呼び出し（ブラウザから直接）。
 * APIキーはユーザーごとに localStorage 管理（profile.ts）。
 */
import type { FieldDef } from "@/lib/config/media";

/** 既定モデル（必要に応じて変更可能） */
export const GEMINI_MODEL = "gemini-2.0-flash";

function endpoint(model: string, key: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
}

export interface GenerateInput {
  mediaName: string;
  sizeLabel: string;
  variantLabel?: string;
  fields: FieldDef[];
  genre?: string;
  tone?: string;
  target?: string;
  hearing: string;
}

/** Gemini に原稿を生成させ、{ fieldKey: value } を返す（文字数上限で安全に切り詰め） */
export async function generateManuscript(
  apiKey: string,
  input: GenerateInput,
): Promise<Record<string, string>> {
  const fieldSpec = input.fields
    .map(
      (f) =>
        `- ${f.key}（${f.label}${f.maxLength ? ` / ${f.maxLength}文字以内` : ""}）`,
    )
    .join("\n");

  const prompt = `あなたはフリーペーパー「${input.mediaName}」の編集者です。
以下のヒアリング内容をもとに、${input.sizeLabel}${input.variantLabel ? `（${input.variantLabel}）` : ""}サイズの広告原稿を作成してください。

# 条件
- 各項目は指定された文字数の上限を必ず守る（超えない）
- ジャンル: ${input.genre ?? "指定なし"}
- トーン: ${input.tone ?? "ミドル"}
- ターゲット: ${input.target ?? "指定なし"}
- 魅力的で具体的に。誇大・虚偽表現は避ける
- 出力は厳密なJSONオブジェクトのみ（キーは下記の項目key、値は文字列）。前後に説明やコードブロックを付けない。

# 項目（key と文字数上限）
${fieldSpec}

# ヒアリング内容
${input.hearing}`;

  const res = await fetch(endpoint(GEMINI_MODEL, apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    let msg = `Gemini API エラー (${res.status})`;
    if (res.status === 400 && t.includes("API key")) msg = "APIキーが無効です";
    if (res.status === 429) msg = "レート上限に達しました。少し待って再試行してください";
    throw new Error(`${msg} ${t.slice(0, 160)}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        obj = JSON.parse(m[0]);
      } catch {
        throw new Error("生成結果の解析に失敗しました");
      }
    } else {
      throw new Error("生成結果の解析に失敗しました");
    }
  }

  const out: Record<string, string> = {};
  for (const f of input.fields) {
    const v = obj[f.key];
    if (typeof v === "string" && v.trim()) {
      out[f.key] = f.maxLength ? v.slice(0, f.maxLength) : v;
    }
  }
  return out;
}
