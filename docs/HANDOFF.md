# kamiedit 引継ぎドキュメント（2026-06-08 セッション）

> 雑誌編集支援・AIアシストWebアプリ「kamiedit」の、2026-06-08 に実施した一連の機能追加・修正の完全な記録と引継ぎ。
> **特に「比留間さんの指示内容」と「その背景・思考プロセス・設計判断」を残すことを目的とする。**
> 次の担当（人 or AI）はまず本書を読めば、経緯と未了タスクを把握して即座に作業を続けられる。

---

## 0. プロジェクト基本情報

| 項目 | 内容 |
|------|------|
| リポジトリ | `hiruma20231111-dev/kamiedit`（GitHub。GCM認証保存済みで push 代行可） |
| ローカル | `C:\Users\hiruma\kamiedit` |
| 本番 | Vercel `https://kamiedit.vercel.app`（main へ push で自動デプロイ） |
| 技術 | Next.js 16 (App Router, Turbopack) + React 19 + TS + Tailwind v4 + shadcn(Base UIベース) + Zustand |
| データ保存 | **バックエンドレス。各ユーザー自身の Google ドライブ**（`kamiedit` フォルダ内 `kamiedit-db.json` ＋画像）。Supabaseは過去に作って撤去済み |
| 認証 | Google Identity Services（`drive.file` + `openid email profile` スコープ）＝SSO。`NEXT_PUBLIC_GOOGLE_CLIENT_ID`（`.env.local`、git管理外） |
| AI | Gemini（`gemini-2.0-flash`）。APIキーはユーザーごとに localStorage（`/profile`で設定）、サーバー非送信 |
| 対応媒体 | **まみたん**（ピンク・割付あり）／**家庭版ぱど**（グリーン・割付あり※今回追加）／**新DOMO!ぱど**（オレンジ・原稿一覧） |

### アーキテクチャ上の最重要点（必読）
- **データは各ユーザーのドライブに完全分離**している。アカウントA と アカウントB はそれぞれ自分のドライブを使い、**データは共有されない**。これは設計上の意図。
- この「分離」が、後述「割付を校正担当に渡したい」という要望と**本質的にトレードオフ**になる（→ 9章の設計判断を参照）。

---

## 1. このセッションの作業サマリー（コミット順）

| # | コミット | 指示の要約 | 主な変更 |
|---|---------|-----------|---------|
| 1 | `842544b` | DnDが本番で全く効かない | ネイティブHTML5 D&D → **Pointer Events方式**へ置換。本番で実証済み |
| 2 | `337f949` | 号の削除ボタンが無い／デザイナーDLは各原稿に | 号削除ボタン追加、`ExportPanel`(号一括)→`ManuscriptExport`(原稿単位)へ移設 |
| 3 | `7f007cd` | 原稿種類タブ整理／枠の色分け／1-4Y・1-2T | 企画区分の導入、枠色(緑/黄)、新サイズ2種 |
| 4 | `c3ec502` | 割付を流用するボタン | `duplicateIssue` ＋作成フォームに流用モード |
| 5 | `6998456` | 他アカウントもログイン可に／割付は共有しない | ログイン時に毎回アカウント選択。分離は元々保証 |
| 6 | `e82056a` | 自社稿用の2/3サイズ(6マス) | 2/3 (2列×3行) を追加 |
| 7 | `8e881cd` | 割付を校正担当に渡して配置換えも | **A案：書き出し/取り込み**を実装 |
| 8 | `7235a9a` | 家庭版ぱども割付対応、グリーン | 「ぱど」→「家庭版ぱど」改名＋割付対応＋greenテーマ |
| 9 | `5458713` | ページ並びを右綴じ面付け順に | `buildSpreads`（先頭=[最終,1]→[2,3]…） |
| 10 | `1460dea` | アタック原稿作成ツール | 媒体別フォーム＋AI(DOMO)＋PDF出力＋保存 |

> ベースは `ce144c1`（前セッションの右綴じ見開きレイアウト）。

---

## 2. 各作業の詳細・指示内容・思考プロセス

### 【作業1】割付DnDの修正（`842544b`）★最重要
- **指示**：「kamieditのDnD検証を続けて」→（検証中）→「もう検証はいいや。実際できないのは確認してます」「君実際に動かしてっていうけど動かせないじゃんいつも」
- **背景**：前セッションで割付を右綴じ見開き＋枠の自由配置/入れ替えに改修(`ce144c1`)したが、比留間さんから「**ログイン済でもDnDが動かない**」と報告。原因未特定のまま持ち越し。
- **思考プロセス**：
  1. ロジック(`placeSlot`)・配線は正しいと確認済みだったが、**実ブラウザでドラッグ発火を一度も観察できていなかった**（環境のブラウザがクラッシュ、Playwright MCPも切断していた）。
  2. 今セッションでPlaywright復活 → 本番で観察を試みるも、比留間さんは「実データを触られるの嫌」「テスト環境ばかり開くな」「本番で確認しろ」と要望。途中で実データのドラッグを2回拒否。
  3. **根本原因の特定**：現状は `draggable` + `onDragStart/onDragOver/onDrop` のネイティブHTML5 D&D。これは「グリッドで枠とドロップセルが重なる構造」＋「ドラッグ元の `pointer-events:none`」＋React19/各ブラウザの癖が噛み合うと**イベントが発火せず無反応**になる典型。Playwright でもネイティブ版は駆動できなかった＝実マウスでも動かない比留間さんの報告と一致。
- **解決**：入力方式を **Pointer Events**（`setPointerCapture` + `document.elementsFromPoint` でドロップ先セル判定、しきい値5pxでクリックと区別、カーソル追従ゴースト、`touch-action:none`でタッチ対応）に全面置換。**配置/スワップ計算 `placeSlot` は既存のまま流用**。
- **検証**：本番 `kamiedit.vercel.app` で、検証用の号「🧪DnD検証用_削除OK」を作り、私(Playwrightのマウス操作)で **①A社⇔B社スワップ ②P1→P2ページ間移動** が動くことを実証。
- **教訓**：ネイティブHTML5 DnD は自動テストで駆動しづらく不具合も起きやすい。Pointer Events 方式なら Playwright のマウスで検証可能＝「直ったことを証明してから渡す」が成立する。

### 【作業2】号削除ボタン＋デザイナーDLの移設（`337f949`）
- **指示**：「号の削除ボタンが無いので実装してください」「デザイナー向けDLは割付にほしいのではなく、各原稿に対してほしいです」
- **思考プロセス**：
  - 号削除：`deleteIssue` はストアにあるがUI未接続だった（＝UIから号を消せなかった）。Driveの生JSONを手編集するのは全データ破損リスクがあるため避け、**アプリの安全な削除ロジック経由**で消すべく削除ボタン(確認ダイアログ付き)を新設。
  - デザイナーDL：`ExportPanel`(号の全原稿一括)を廃止し、`ManuscriptExport`(1原稿単位)を新設して原稿編集画面の操作バーに配置。`export.ts` の出力関数を単一原稿配列で再利用。
- **重要インシデント**：このビルド時、`.next`の型キャッシュ更新のため `Get-Process node | Stop-Process` で**全nodeプロセスを停止した結果、Playwright等のMCPサーバープロセスまで巻き込んで切断**してしまった。以後このセッションではブラウザ検証不可に。→ **教訓：MCP稼働中は node 全停止をしない。`.next`削除＋再ビルドで十分。**

### 【作業3】企画区分・枠色・新サイズ（`7f007cd`）
- **指示**：「表紙・巻頭記事・自社稿は私が編集しないので、**枠作成のタブは残す**が、新規/過去修正の**原稿編集ではそのタブは不要**。ほしいのは**フォーマット・フリー・スクール・マネセミ・その他企画**などの項目」「枠作成時、**自社稿・表紙・巻頭記事は緑枠**、**新規/過去修正/過去流用は黄枠**で」「まみたんの**1/4には横2枠の1/4Y**、**1/2には縦4枠の1/2T**を」
- **思考プロセス**：
  - 「原稿種類(kind=広告/自社稿/巻頭/表紙)」は**枠の構造区分**なので AddFrameDialog では維持。一方、原稿編集画面では編集対象の広告原稿の**企画区分(category)** を選ばせたい → `ManuscriptCategory`(format/free/school/money_seminar/other) を新設し、編集画面の種類タブを置換。`kind`は枠から継承し編集画面では非表示。
  - 枠色：`slot.kind` が inhouse/lead/cover → **緑(emerald)**、`source_type` が new/reuse/edit → **黄(amber)**、それ以外はテーマ色。`layout-board.tsx` の `toneClass` で分岐。
  - 新サイズ：2×4=8マスのグリッドで `1/4Y`={col:2,row:1}(横長)、`1/2T`={col:1,row:4}(縦長)。`layout.ts` の `SIZE_UNITS`/`sizeSpan`、`media.ts` の `layoutSizes` に追加。

### 【作業4】割付の流用（`c3ec502`）
- **指示**：「割付を作成する際、前回と構成が近い場合があるので、**割付を流用するボタン**を。流用する割付は既存の中から選べればOK」
- **実装**：`duplicateIssue(sourceIssueId, input)` を store に追加。**既存号の枠(構成)とページ構成をコピーして新規号を作成**。原稿リンク(`manuscript_id`/`source_type`)は引き継がず空枠で複製。`NewIssueForm` に「ゼロから作成／割付を流用」のモード切替＋流用元プルダウンを追加。

### 【作業5】複数アカウントログイン（`6998456`）
- **指示**：「他の人のGoogleアカウントでもログインできるように。別アカウントでログインした場合は**割付情報は共有されないように**」
- **思考プロセス**：
  - **データ分離は元々保証**（各自ドライブ）。コード上にドメイン制限等の制限も無い（grep済み）。→ 共有されない要件は追加対応不要。
  - 「他人がログインできる」かは **GCP OAuth同意画面の公開状態次第**。コード側は `signIn` の prompt を `select_account consent` に変えて、共有PCでも別の人がアカウントを選べるよう改善。
- **GCP確認結果（比留間さん報告）**：公開ステータス=**本番環境**／ユーザー種類=**外部**／上限0-100。スコープは `openid email profile drive.file` で**全て非機密** → **誰でもログイン可・100人上限は適用されない・「未確認アプリ」警告も基本出ない**。**GCP追加作業は不要**。使わせたい人に本番URLを共有するだけ。

### 【作業6】2/3サイズ（`e82056a`）
- **指示**：「自社稿の場合、**2/3サイズ（6マス）**もあるため設定して」
- **実装**：6マス=2列×3行。`layoutSizes` に `2/3` を追加（`SIZE_UNITS:6`、`sizeSpan:{col:2,row:3}`）。主に自社稿用（自社稿は緑枠で表示）。

### 【作業7】割付の校正担当への受け渡し（`8e881cd`）★設計判断あり
- **指示**：「最終的に割付を**校正担当にそのまま渡せて**、かつ**配置換えも校正担当で行える**と便利。各Googleアカウントでログインできるようにしたので、どうしたらよいか悩んでます」
- **思考プロセス（壁打ち）**：データが各自ドライブに分離しているため、A が作った割付は校正担当(B)から見えず、そのままでは渡せない＝「分離」と「受け渡し」のトレードオフ。3案を提示：
  - **A 書き出し/取り込み**（小・設計維持・非同時）
  - **B 共有リンクで共同編集**（中・バックエンドレス維持・Drive共有+Pickerが必要）
  - **C 共有バックエンド(Supabase等)へ移行**（大・本格的な同時編集/権限/履歴）
- **比留間さんの選択＝A**。
- **実装**：`exportIssue`(同期・枠+原稿テキストを書き出し／**画像は除外**＝バイナリは元ドライブにあるため)、`importIssue`(ID振り直し・新規号として取り込み)。号ページに「割付を書き出す」、媒体一覧に「割付を取り込む」。`lib/layout-transfer.ts` にパッケージ形式とバリデーション。
- **運用**：A(営業/編集)が書き出し→ファイル送付→B(校正)が自分のkamieditに取り込み→DnDで配置換え→書き出して返送。**同時編集ではなくファイルの往復**。将来 B/C へ切替可能。

### 【作業8】家庭版ぱどの割付対応（`7235a9a`）★設計判断あり
- **指示**：「家庭版ぱどの割付も。**家庭版ぱどっぽいカラーリングでベースカラーはまみたんと分けて**」
- **確認した点（AskUserQuestionで質問）**：
  - 媒体の扱い → **既存「ぱど」を「家庭版ぱど」に改名＋割付対応**（選択）。
  - ベースカラー → **グリーン系**（選択）。
- **実装**：`media.pado` を name=家庭版ぱど・theme=green・`hasLayout:true`・pageOptions追加。サイズはまみたんと共通の `layoutSizes` を新設して共用。`ThemeColor` に `green` 追加、`THEME_STYLES.green` 定義。不要化した `padoFields` を削除。**`media_id` は "pado" のまま**（既存データ参照を維持）。
- **注意**：既存「ぱど」で原稿一覧として作っていた号があれば、割付表示に変わるため見え方が変わる（比留間さん了承済み）。

### 【作業9】見開きの面付け順（`5458713`）
- **指示**：「右端の列が、右に冊子の最終ページ・左に1ページ、その下に右2・左3、その下に右4・左5…。例えば24ページ構成なら右端列の最初は右が24、その左が1」
- **実装**：`buildSpreads(pageCount)` で見開き列を生成。各見開き=`[右ページ, 左ページ]`。先頭=`[最終ページ, 1]`(表裏表紙)、以降 `[2,3],[4,5],[6,7]…`。`SPREADS_PER_COL=4` ごとに列へ。奇数ページは空き面でパディング（現状ページ数は全て偶数）。`flex-row-reverse` で右ページが右に来る。

### 【作業10】アタック原稿作成ツール（`1460dea`）★大型・v1
- **指示**：「各割付タブの下に、各媒体の**アタック原稿作成ツール**を。アタック原稿＝営業で持っていく仮でクライアントに見せる原稿。**DOMOぱどは1/4と1/2、まみたん・家庭版ぱどは1P・1/2・1/4**。出来上がりを**PDF出力**。**特にDOMOぱどは左の要項を埋めて、右のフリー欄は左から拾える範囲で雰囲気に合わせAI生成**。他媒体は文言や仮写真を挿入できると良い。アタック原稿のイメージは参考URL(後述)からさらって」
- **確認した点（AskUserQuestion）**：
  - データの持ち方 → **媒体ごとに保存して再利用**（選択）。
  - 進め方 → **まず概算フォーマットでv1を作る**（選択）。
- **実装**：
  - `DriveDB` に `attacks[]` 追加（号に紐づかない**媒体単位**）。`AttackManuscript` 型。store に `addAttack/updateAttack/deleteAttack`。
  - `lib/config/attack.ts`：媒体別フォーマット（DOMO=求人要項+右フリー+写真1／まみたん・家庭版ぱど=販促項目+写真3）。
  - `components/attack-section.tsx`：媒体ページ下部のセクション(一覧+サイズ選択して作成)。
  - `components/attack-editor.tsx`：フォーム＋仮写真(縮小dataURLで保存)＋DOMOのAIフリー欄＋保存/削除/PDF出力。
  - `app/[media]/attack/[attackId]/page.tsx`：編集ルート。
  - `lib/attack-export.ts`：媒体テーマ色の体裁HTML→印刷でPDF（`export.ts` の `printInstruction` 流用）。
  - `lib/gemini.ts` に `generateAttackFreeText`（左要項から右フリー文を生成。要項に無い待遇は創作しない指示込み）。
- **重要な制約**：**体裁は概算v1**。下記の参考誌面をまだ見られていない（MCP切断中）ため、一般的な広告体裁で作成。実物に寄せるのは要対応（→8章）。

---

## 3. 主要ファイルマップ（今回触った/追加した範囲）

```
src/lib/
  store.ts            … Zustand。今回 duplicateIssue / exportIssue / importIssue / addAttack 等を追加
  db.ts               … DriveDB に attacks[] 追加（normalizeDb で後方互換）
  types.ts            … ManuscriptCategory / AttackManuscript / Manuscript.category 追加
  layout.ts           … SIZE_UNITS / sizeSpan に 1/4Y・1/2T・2/3 追加
  theme.ts            … green テーマ追加
  gemini.ts           … generateAttackFreeText 追加
  export.ts           … printInstruction（流用元・既存）
  layout-transfer.ts  … 【新規】割付受け渡しパッケージ形式
  attack-export.ts    … 【新規】アタック原稿PDF用HTML生成
  config/
    media.ts          … layoutSizes 共通化、家庭版ぱど化、ThemeColor に green
    attack.ts         … 【新規】アタック原稿の媒体別フォーマット
src/components/
  layout-board.tsx    … Pointer Events DnD、枠色(緑/黄)、buildSpreads(面付け順)
  manuscript-editor.tsx … 原稿種類→企画区分、ManuscriptExport配置
  delete-issue-button.tsx … 【新規】号削除（確認ダイアログ）
  manuscript-export.tsx … 【新規】原稿単位デザイナーDL（旧export-panel.tsxを改名）
  export-layout-button.tsx … 【新規】割付の書き出し
  import-layout-button.tsx … 【新規】割付の取り込み
  attack-section.tsx  … 【新規】媒体ページのアタック原稿セクション
  attack-editor.tsx   … 【新規】アタック原稿エディタ
src/app/[media]/
  page.tsx            … 号削除ボタン・取り込みボタン・AttackSection 配置
  new-issue-form.tsx  … 割付流用モード追加
  [issueId]/page.tsx  … 割付の書き出しボタン配置（デザイナーDLは撤去）
  attack/[attackId]/page.tsx … 【新規】アタック原稿編集ルート
```

---

## 4. 環境・落とし穴（次の担当者向け）

- **OS/Shell**：Windows 11 / PowerShell。`npm` でなく **`npm.cmd`**（`Start-Process` 時）。
- **Next.js 16**：`AGENTS.md` に「学習データと異なる破壊的変更あり。`node_modules/next/dist/docs/` を読め」とある。`middleware`→`proxy.ts`、`cookies()`/`params` が async 等。
- **MCP（Playwright/Gmail/Drive等）は node プロセス**。`Get-Process node | Stop-Process` で**MCPごと落ちる**。ビルド掃除は `Remove-Item .next -Recurse -Force` ＋再ビルドで十分。
- **ルート削除後のビルド**：`.next/types` の検証ファイルが旧ルートを参照して `tsc` が失敗することがある。`.next` を消して再ビルドすれば解消。
- **git**：LF→CRLF の warning は無害。push でVercel自動デプロイ。
- **GitHub認証**：GCMに保存済みで push 代行可。`gh` CLI・superpowers は未インストール。

---

## 5. 検証コマンド（毎回これでグリーンを確認してから push）

```powershell
cd C:\Users\hiruma\kamiedit
npx tsc --noEmit          # 型のみ素早く
npm run build             # 型＋lint＋本番ビルド（これが通ればpush）
```

---

## 6. 現在の媒体・サイズ・色の一覧（仕様の現状）

| 媒体 | id | 色 | 割付 | 割付サイズ |
|------|----|----|------|-----------|
| まみたん | mamitan | ピンク | あり | 1/8・1/4・1/4Y・1/2・1/2T・2/3・1P・2P |
| 家庭版ぱど | pado | グリーン | あり | （まみたんと共通 layoutSizes） |
| 新DOMO!ぱど | shin_domo | オレンジ | なし(原稿一覧) | （求人サイズ 1/16P〜2P） |

- **枠の色**：自社稿/表紙/巻頭記事=緑、新規/過去修正/過去流用で原稿付き=黄、空き=テーマ色。
- **企画区分**（原稿編集）：フォーマット/フリー/スクール/マネセミ/その他企画。
- **アタック原稿サイズ**：DOMO=1/4・1/2／まみたん・家庭版ぱど=1P・1/2・1/4。

---

## 7. ★未了タスク（次の作業・優先度順）

### 高：本番ブラウザ検証（**Claude Code 再起動で Playwright MCP 復活が前提**）
今セッションは型/ビルドは全てグリーンだが、MCP切断のため**ブラウザ目視確認ができていない**。再起動後にまとめて：
1. DnD（スワップ/ページ移動）※作業1のみ実証済み、他は未
2. 号削除ボタン／原稿単位デザイナーDL
3. 企画区分タブ／枠色(緑・黄)／新サイズ(1/4Y・1/2T・2/3)
4. 割付の流用（既存号からコピー）
5. 割付の書き出し→取り込みのラウンドトリップ
6. 家庭版ぱど（グリーン表示・割付動作）
7. 面付け順（右端列トップが [最終ページ, 1] になっているか）
8. アタック原稿（作成・DOMOのAI生成・PDF出力）

### 高：検証用の号の削除
- 本番まみたんに **「🧪DnD検証用_削除OK」**（id: `ea735e37-28e0-4e6a-b4d9-754a90eadb65`、A社/B社の1/4枠入り）が残っている。
- 今回追加した**号削除ボタン**で比留間さん自身も消せる。MCP復活後は私が消してもよい。

### 中：アタック原稿の体裁を実物誌面に寄せる（参考URL）
v1は概算体裁。下記を見て要項項目・レイアウト・写真位置等を寄せる。
- **DOMOぱど**（flipbook・要ブラウザ）：`https://domo.meclib.jp/library/books/domop_kho_260522/book/index.html#target/page_no=1`
- **まみたん**（PDF）：`https://d2v3alhynfa654.cloudfront.net/ebook/osakahigashi/osakae_mami_001.pdf`
- **家庭版ぱど**（PDF）：`https://www.kansaipado.co.jp/ebook/hirakatakatano01_03_pado_001.pdf`
- ※2つのPDFは `Invoke-WebRequest` でDLして `Read`(PDF対応) で確認可能。DOMOはPlaywrightで開く。

### 中：本番VercelデプロイのOAuth設定（前セッションからの繰越）
- OAuthクライアント（`772573718834-...apps.googleusercontent.com`）の承認済みJS生成元/リダイレクトURIに `https://kamiedit.vercel.app` は**追加済み**（比留間さん対応済み）。GCP公開ステータス本番環境=誰でもログイン可。→ 概ね完了。

### 低〜中：その他
- 家庭版ぱどの表紙カード画像が暫定（既存pado.jpgのまま）。専用画像は `public/covers/` に置けば反映。
- 文字数上限の最終確定（媒体資料PDF・まみたんFO原稿用紙.xlsx）。新DOMO/ぱどは暫定値。
- アタック原稿の写真は縮小dataURLをDB(JSON)に直接保存。多用するとDBが肥大化する懸念 → 将来Driveファイル化を検討。
- 受け渡し(A案)は非同時。将来 B案(共有リンク/Picker) or C案(共有DB)へ拡張する余地。

### 参考：kamiedit 以外の繰越（別件・`.company/secretary/todos/` 管理）
- 架電リスト（八尾page6〜/大東/柏原/平野/生野/東住吉の企業収集・入力、1000社到達で行追加確認）。

---

## 8. 設計判断の要点（迷ったら参照）

1. **DnDは Pointer Events**（ネイティブHTML5 DnDに戻さない）。理由：グリッド重なり＋pointer-events無効化で無反応になる／自動検証できない。
2. **データは各自ドライブで分離**。共同作業は「**割付の書き出し/取り込み(A案)**」で対応。同時編集が必要になったら B/C を再検討。
3. **media_id は不変**（"pado" のまま改名）。表示名・テーマだけ変更し既存データ参照を守る。
4. **アタック原稿は号に紐づかない媒体単位**のデータ（営業ツールのため）。
5. **AIはGemini（クライアント直叩き・キーはlocalStorage）**。サーバーに機密を持たない方針を維持。

---

## 9. 次の担当が最初にやること（クイックスタート）

```powershell
cd C:\Users\hiruma\kamiedit
git pull
npm install        # 念のため
npm run build      # グリーン確認
npm run dev        # ローカル確認（localhost:3000）
```
1. 本書「7章 未了タスク」の**高**から着手。
2. ブラウザ検証は **Claude Code 再起動 → Playwright MCP 復活**が前提。
3. 変更したら必ず `npm run build` を通してから `git push`（Vercel自動デプロイ）。

---

_最終更新: 2026-06-08 / 最新コミット: `1460dea`_
