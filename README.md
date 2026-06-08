# kamiedit — フリーペーパー編集支援・AIアシストWebアプリ

まみたん / ぱど / 新DOMO!ぱど の3媒体に対応した、雑誌編集部向けの原稿作成・割付管理ツール。
Gemini API による原稿自動生成、デザイナー向けエクスポート（指示書PDF・写真ZIP）を備える。

## 技術スタック

| 領域 | 採用技術 |
|------|---------|
| フロント | Next.js 16 (App Router) / React 19 / TypeScript |
| スタイル | Tailwind CSS v4 / shadcn/ui |
| バックエンド | Supabase（PostgreSQL + RLS + Auth + Storage） |
| 認証 | Supabase Auth（Google OAuth） |
| AI | Google Gemini API（APIキーはユーザーごとにブラウザ保存） |
| デプロイ | Vercel |

## 権限モデル

- **編集者**: Googleログイン済みユーザー。全編集・原稿作成・AI機能が利用可。
- **閲覧者**: 未ログイン。共有URLから割付表・一覧を **閲覧のみ**（RLS の anon SELECT で制御）。

## セットアップ

### 1. 依存インストール

```bash
npm install
```

### 2. Supabase プロジェクト準備

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. SQL Editor で `supabase/migrations/0001_init.sql` → `0002_storage.sql` を順に実行
3. Authentication > Providers で **Google** を有効化（Google Cloud の OAuth クライアントが必要）
4. Project Settings > API から URL と anon key を取得

### 3. 環境変数

`.env.example` を `.env.local` にコピーして値を設定。

```bash
cp .env.example .env.local
```

### 4. 開発サーバー

```bash
npm run dev
```

## DBスキーマ概要

| テーブル | 役割 |
|---------|------|
| `media` | 媒体マスタ（まみたん/ぱど/新DOMO）。テーマカラー・割付有無 |
| `profiles` | ユーザー情報（auth.users と 1:1、role 管理） |
| `issues` | 号数（媒体ごと。まみたんは page_count に 16/24/32/40） |
| `manuscripts` | 原稿本体。サイズ別の動的項目を `content`(JSONB) に保持 |
| `layout_slots` | まみたんの割付の枠（ページ・サイズ・原稿との紐付け） |
| `manuscript_images` | 原稿に紐づく画像（Storage パス・元ファイル名） |

フォーマット定義（サイズ・項目・文字数上限）は `src/lib/config/media.ts` に集約。
※ 文字数上限は暫定値。参考資料を基に「動的フォーム」フェーズで確定する。

## 実装ロードマップ

- [x] **Step 1**: プロジェクト初期化 ＋ DBスキーマ設計 ← 現在地
- [ ] **Step 2**: Google認証 ＋ TOP画面（媒体選択）
- [ ] **Step 3**: まみたん割付表（グリッドUI）／ぱど・新DOMO 一覧
- [ ] **Step 4**: 原稿作成エディタ（動的フォーム・文字数ゲージ・画像D&D）
- [ ] **Step 5**: Gemini AIアシスト
- [ ] **Step 6**: エクスポート（指示書PDF・写真ZIP）
