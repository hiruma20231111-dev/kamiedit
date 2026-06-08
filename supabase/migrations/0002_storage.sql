-- ============================================================
-- 画像ストレージ用バケット
--   - 閲覧者(anon)        : 読取のみ（共有URLでの画像表示）
--   - 編集者(authenticated): アップロード／更新／削除
-- ============================================================

insert into storage.buckets (id, name, public)
values ('manuscript-images', 'manuscript-images', true)
on conflict (id) do nothing;

-- 公開読取
create policy "public read manuscript images"
  on storage.objects for select
  using (bucket_id = 'manuscript-images');

-- 編集者のアップロード／更新／削除
create policy "editor insert manuscript images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'manuscript-images');

create policy "editor update manuscript images"
  on storage.objects for update to authenticated
  using (bucket_id = 'manuscript-images');

create policy "editor delete manuscript images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'manuscript-images');
