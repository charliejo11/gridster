-- Home composer stores uploaded media in gridster_posts.photo_url, the same
-- text column images already use. Widen the existing public post-photos
-- bucket so MP4 and WEBM uploads succeed.
--
-- file_size_limit is one number for the whole bucket. It rises from 8MB to
-- 50MB, which is Supabase's standard per-object upload ceiling. Image
-- uploads are still rejected above 8MB in the client
-- (GRIDSTER_MAX_POST_PHOTO_BYTES). MOV / video/quicktime is not allowed:
-- an HTML5 video element cannot reliably play it outside Safari.

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm'
  ]
where id = 'post-photos';
