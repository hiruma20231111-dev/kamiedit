-- ============================================================
-- kamiedit 初期スキーマ
--   - 認証: Supabase Auth (Google OAuth)
--   - 編集者 = ログイン済みユーザー / 閲覧者 = 未ログイン(anon, 読取のみ)
--   - Gemini API キーはDBに保存しない（ブラウザ localStorage 管理）
-- ============================================================

-- ---------- マスタ: 媒体 ----------
create table if not exists public.media (
  id          text primary key,             -- 'mamitan' | 'pado' | 'shin_domo'
  name        text not null,                -- 表示名
  theme_color text not null,                -- 'pink' | 'blue' | 'orange'
  has_layout  boolean not null default false, -- まみたん=true（割付表あり）
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- プロフィール（auth.users と 1:1） ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  role       text not null default 'editor', -- 'admin' | 'editor'
  created_at timestamptz not null default now()
);

-- 新規ユーザー作成時に自動で profiles 行を作るトリガ
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 号数 ----------
create table if not exists public.issues (
  id         uuid primary key default gen_random_uuid(),
  media_id   text not null references public.media(id),
  name       text not null,                 -- '2026年6月号'
  year       int,
  month      int,
  page_count int,                           -- まみたん: 16/24/32/40。他媒体は null
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_issues_media on public.issues(media_id);

-- ---------- 原稿 ----------
create table if not exists public.manuscripts (
  id           uuid primary key default gen_random_uuid(),
  issue_id     uuid not null references public.issues(id) on delete cascade,
  media_id     text not null references public.media(id),
  size         text not null,               -- '1/8','1/4','1P','1/16P' など
  variant      text,                        -- まみたん1/4: '1store'|'2store'
  company_name text,                         -- 社名
  display_name text,                         -- 掲載名
  -- AIアシスト用パラメータ
  genre        text,
  tone         text,
  target       text,
  -- サイズ別の動的フィールドを JSONB で保持（config/media.ts の FieldDef.key と対応）
  content      jsonb not null default '{}'::jsonb,
  remarks      text,                         -- デザイナー向け備考
  status       text not null default 'draft', -- 'draft' | 'done'
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_manuscripts_issue on public.manuscripts(issue_id);

-- ---------- 割付の枠（まみたんのみ使用） ----------
create table if not exists public.layout_slots (
  id            uuid primary key default gen_random_uuid(),
  issue_id      uuid not null references public.issues(id) on delete cascade,
  page_no       int not null,               -- ページ番号
  position      int not null default 0,      -- ページ内の並び順／グリッド位置
  size          text not null,               -- '1/8','1/4','1/2','1P','2P'
  company_name  text,
  display_name  text,
  manuscript_id uuid references public.manuscripts(id) on delete set null,
  source_type   text,                        -- 'new'|'reuse'|'edit'|'supplied'(供給原稿)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_slots_issue on public.layout_slots(issue_id);

-- ---------- 原稿に紐づく画像 ----------
create table if not exists public.manuscript_images (
  id            uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  storage_path  text not null,               -- Supabase Storage 内のパス
  original_name text,                          -- アップロード時の元ファイル名
  role          text,                          -- '写真1' 等（リネーム規則に使用）
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_images_manuscript on public.manuscript_images(manuscript_id);

-- updated_at 自動更新
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists t_issues_touch on public.issues;
create trigger t_issues_touch before update on public.issues
  for each row execute function public.touch_updated_at();
drop trigger if exists t_manuscripts_touch on public.manuscripts;
create trigger t_manuscripts_touch before update on public.manuscripts
  for each row execute function public.touch_updated_at();
drop trigger if exists t_slots_touch on public.layout_slots;
create trigger t_slots_touch before update on public.layout_slots
  for each row execute function public.touch_updated_at();

-- ============================================================
-- RLS（行レベルセキュリティ）
--   閲覧者(anon)        : SELECT のみ許可（共有URLでの閲覧）
--   編集者(authenticated): フルアクセス
--   profiles            : 本人のみ参照・更新
-- ============================================================
alter table public.media              enable row level security;
alter table public.issues             enable row level security;
alter table public.manuscripts        enable row level security;
alter table public.layout_slots       enable row level security;
alter table public.manuscript_images  enable row level security;
alter table public.profiles           enable row level security;

-- 公開読取（閲覧者向け）
create policy "public read media"   on public.media              for select using (true);
create policy "public read issues"  on public.issues             for select using (true);
create policy "public read scripts" on public.manuscripts        for select using (true);
create policy "public read slots"   on public.layout_slots       for select using (true);
create policy "public read images"  on public.manuscript_images  for select using (true);

-- 編集者のフルアクセス（ログイン済みなら全操作可）
create policy "editor all issues"  on public.issues
  for all to authenticated using (true) with check (true);
create policy "editor all scripts" on public.manuscripts
  for all to authenticated using (true) with check (true);
create policy "editor all slots"   on public.layout_slots
  for all to authenticated using (true) with check (true);
create policy "editor all images"  on public.manuscript_images
  for all to authenticated using (true) with check (true);

-- profiles は本人のみ
create policy "own profile select" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- 媒体マスタの初期データ ----------
insert into public.media (id, name, theme_color, has_layout, sort_order) values
  ('mamitan',   'まみたん',     'pink',   true,  1),
  ('pado',      'ぱど',         'blue',   false, 2),
  ('shin_domo', '新DOMO!ぱど',  'orange', false, 3)
on conflict (id) do nothing;
