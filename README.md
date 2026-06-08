# kamiedit — フリーペーパー編集支援・AIアシストWebアプリ

まみたん / ぱど / 新DOMO!ぱど の3媒体に対応した、雑誌編集部向けの原稿作成・割付管理ツール。
Gemini API による原稿自動生成、デザイナー向けエクスポート（指示書PDF・写真ZIP）を備える。

## アーキテクチャ（バックエンドレス / Google ドライブをDBに）

- **データの保存先 = 各ユーザーの Google ドライブ**（`kamiedit` フォルダ内の `kamiedit-db.json` ＋画像ファイル）
- **ログイン = Google サインイン**（Google Identity Services）。これがそのまま SSO になる
- **同期**: 同じ Google アカウントなら別PCでも同じデータを参照（Driveはアカウント単位）
- **サーバー/外部DB不要** → Vercel にそのままデプロイ可能
- スコープは `drive.file`（アプリが作成したファイルのみアクセス）で最小権限

> 補足: 「未ログイン閲覧者が共有URLで閲覧」は他人のDriveを未認証で読めないため本方式では制限されます。
> 共有は Drive フォルダ共有 / エクスポートで代替予定（後続ステップで検討）。

## 技術スタック

| 領域 | 採用技術 |
|------|---------|
| フロント | Next.js 16 (App Router) / React 19 / TypeScript |
| スタイル | Tailwind CSS v4 / shadcn/ui |
| 状態管理 | Zustand |
| 認証/保存 | Google Identity Services + Google Drive API（drive.file） |
| AI | Google Gemini API（APIキーはユーザーごとにブラウザ保存） |
| デプロイ | Vercel |

## セットアップ

### 1. 依存インストール

```bash
npm install
```

### 2. Google OAuth クライアントID を作成

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを選択（既存でも可）
2. 「APIとサービス」→「ライブラリ」で **Google Drive API** を有効化
3. 「OAuth 同意画面」を設定（外部 or 内部。テストユーザーに利用者を追加）
4. 「認証情報」→「OAuth クライアントID を作成」→ 種類 **ウェブアプリケーション**
   - 承認済みの JavaScript 生成元: `http://localhost:3000`（および本番URL）
5. 発行された **クライアントID** をコピー

### 3. 環境変数

`.env.example` を `.env.local` にコピーし、クライアントIDを設定。

```bash
cp .env.example .env.local
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
```

### 4. 開発サーバー

```bash
npm run dev
```

未設定でも「プレビューモード」で起動します（ログイン・保存は無効）。

## データモデル（kamiedit-db.json）

| キー | 内容 |
|------|------|
| `issues` | 号数（媒体ごと。まみたんは page_count=16/24/32/40） |
| `manuscripts` | 原稿本体。サイズ別の動的項目を `content` に保持 |
| `slots` | まみたんの割付の枠（ページ/サイズ/原稿の紐付け） |
| `images` | 画像メタ（Drive の fileId・元ファイル名・並び順） |

フォーマット定義（サイズ・項目・文字数上限）は `src/lib/config/media.ts` に集約。
※ 文字数上限は暫定値。参考資料を基に「動的フォーム」フェーズで確定する。

## 実装ロードマップ

- [x] **Step 1**: プロジェクト初期化（DB設計→Google ドライブ方式に変更）
- [x] **Step 2**: Google ログイン ＋ TOP画面（媒体選択）＋号数管理
- [ ] **Step 3**: まみたん割付表（グリッドUI）／ぱど・新DOMO 一覧
- [ ] **Step 4**: 原稿作成エディタ（動的フォーム・文字数ゲージ・画像D&D）
- [ ] **Step 5**: Gemini AIアシスト
- [ ] **Step 6**: エクスポート（指示書PDF・写真ZIP）
