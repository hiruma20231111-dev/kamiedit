/**
 * Google Picker（ブラウザ専用）。
 * ユーザーが選んだスプレッドシートだけ drive.file でアクセス可能になる。
 * フォームの回答シートを1度選んでもらい、その spreadsheetId を受注インボックスに使う。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gapi?: any;
  }
}

let pickerLoaded: Promise<void> | null = null;

function loadPickerApi(): Promise<void> {
  if (pickerLoaded) return pickerLoaded;
  pickerLoaded = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.google?.picker) return resolve();
    const s = document.createElement("script");
    s.src = "https://apis.google.com/js/api.js";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      window.gapi.load("picker", {
        callback: () => resolve(),
        onerror: () => reject(new Error("Picker の読み込みに失敗しました")),
      });
    };
    s.onerror = () => reject(new Error("gapi の読み込みに失敗しました"));
    document.head.appendChild(s);
  });
  return pickerLoaded;
}

/** スプレッドシート選択の Picker を開く。選んだら {id,name}、キャンセルは null */
export async function pickSpreadsheet(
  token: string,
  apiKey: string,
): Promise<{ id: string; name: string } | null> {
  await loadPickerApi();
  const google = window.google;
  if (!google?.picker) throw new Error("Picker が利用できません");

  return new Promise((resolve) => {
    const view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false)
      .setMode(google.picker.DocsViewMode.LIST);

    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setTitle("受注シート（フォームの回答）を選択")
      .setCallback((data: any) => {
        const action = data[google.picker.Response.ACTION];
        if (action === google.picker.Action.PICKED) {
          const doc = data[google.picker.Response.DOCUMENTS]?.[0];
          resolve(
            doc
              ? {
                  id: doc[google.picker.Document.ID],
                  name: doc[google.picker.Document.NAME],
                }
              : null,
          );
        } else if (action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();
    picker.setVisible(true);
  });
}
