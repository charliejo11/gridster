-- Storage bucket + policies for user-uploaded post/event/place photos.
-- gridster_posts.photo_url, gridster_events.photo_url, and gridster_places.photo_url
-- already exist as plain text URL columns; uploads write their public Storage URL
-- into those same columns, no schema change needed there.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-photos',
  'post-photos',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read access to post photos" on storage.objects;
create policy "Public read access to post photos"
on storage.objects for select
using (bucket_id = 'post-photos');

drop policy if exists "Users can upload their own post photos" on storage.objects;
create policy "Users can upload their own post photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own post photos" on storage.objects;
create policy "Users can update their own post photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own post photos" on storage.objects;
create policy "Users can delete their own post photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
