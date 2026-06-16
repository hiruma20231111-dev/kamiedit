/**
 * Google Sheets REST 操作（drive.file スコープ）。
 * アプリが作成したスプレッドシート（受注インボックス）だけを読み書きする。
 * drive.file はアプリが作成/オープンしたファイルにのみアクセス可。
 */

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function asJson(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sheets API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/** スプレッドシートを新規作成し spreadsheetId を返す（drive.file: アプリ作成ファイル） */
export async function createSpreadsheet(
  token: string,
  title: string,
): Promise<string> {
  const created = await asJson(
    await fetch(SHEETS_API, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { title } }),
    }),
  );
  return created.spreadsheetId as string;
}

/** 範囲の値を2次元配列で取得（空セルは欠ける場合がある） */
export async function getValues(
  token: string,
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const data = await asJson(
    await fetch(
      `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      { headers: authHeaders(token) },
    ),
  );
  return (data.values as string[][]) ?? [];
}

/** 範囲へ値を上書き（RAW） */
export async function updateValues(
  token: string,
  spreadsheetId: string,
  range: string,
  values: (string | number)[][],
): Promise<void> {
  await asJson(
    await fetch(
      `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(
        range,
      )}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      },
    ),
  );
}

/** 末尾へ行を追加 */
export async function appendValues(
  token: string,
  spreadsheetId: string,
  range: string,
  values: (string | number)[][],
): Promise<void> {
  await asJson(
    await fetch(
      `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(
        range,
      )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      },
    ),
  );
}
