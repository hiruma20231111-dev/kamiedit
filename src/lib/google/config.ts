/**
 * Google 連携の設定。
 * データの保存先は各ユーザーの Google ドライブ（drive.file スコープ）。
 * クライアントID は公開値（シークレットではない）なので NEXT_PUBLIC_ で持つ。
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** Google Picker 用の APIキー（ブラウザキー）。受注シートの選択に使用 */
export const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";

/** openid/email/profile + アプリが作成した Drive ファイルのみアクセス可能な drive.file */
export const SCOPES =
  "openid email profile https://www.googleapis.com/auth/drive.file";

export function hasGoogleEnv(): boolean {
  return !!GOOGLE_CLIENT_ID;
}

/** Drive 上のアプリ用フォルダ名・DBファイル名 */
export const DRIVE_FOLDER_NAME = "kamiedit";
export const DRIVE_DB_NAME = "kamiedit-db.json";
