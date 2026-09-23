import { supabase } from "./supabaseClient";

export const GRIDSTER_POST_PHOTOS_BUCKET = "post-photos";
export const GRIDSTER_MAX_POST_PHOTO_BYTES = 8 * 1024 * 1024;
// Supabase's standard per-object upload ceiling is 50MB. Home uploads go
// browser → Storage, not through the Cloudflare Worker, so the Worker body
// limit does not apply. The bucket file_size_limit is a single number, so
// the bucket cap matches this video cap; image uploads stay at 8MB in
// client validation below.
export const GRIDSTER_MAX_POST_VIDEO_BYTES = 50 * 1024 * 1024;
export const GRIDSTER_ALLOWED_POST_PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
// MP4 (H.264/AAC) and WEBM play in an HTML5 <video> element across current
// browsers. MOV / video/quicktime is omitted: Chrome and Firefox often
// cannot play it.
export const GRIDSTER_ALLOWED_POST_VIDEO_TYPES = ["video/mp4", "video/webm"];
export const GRIDSTER_POST_PHOTO_ACCEPT = GRIDSTER_ALLOWED_POST_PHOTO_TYPES.join(",");
export const GRIDSTER_POST_MEDIA_ACCEPT = [
  ...GRIDSTER_ALLOWED_POST_PHOTO_TYPES,
  ...GRIDSTER_ALLOWED_POST_VIDEO_TYPES,
  ".mp4",
  ".m4v",
  ".webm",
].join(",");
export const GRIDSTER_POST_PHOTO_HINT = "PNG, JPEG, WEBP, or GIF. Max 8MB.";
export const GRIDSTER_POST_MEDIA_HINT = "PNG, JPEG, WEBP, GIF, MP4, or WEBM. Images max 8MB. Videos max 50MB.";

const POST_MEDIA_EXTENSIONS_BY_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const VIDEO_MIME_BY_EXTENSION = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
};

const VIDEO_URL_EXTENSIONS = new Set(["mp4", "m4v", "webm"]);

// Browsers sometimes leave File.type empty, or report a TikTok .mp4 as a
// generic or QuickTime type. Trust those only when the filename extension
// is a web video we can actually play.
const INFERABLE_VIDEO_MIME_TYPES = new Set(["", "application/octet-stream", "application/mp4", "video/quicktime"]);

function normalizedMimeType(type) {
  return String(type || "").toLowerCase().split(";")[0].trim();
}

function fileExtension(name) {
  const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

export function resolveGridsterPostMediaType(file) {
  const rawType = normalizedMimeType(file?.type);

  if (GRIDSTER_ALLOWED_POST_PHOTO_TYPES.includes(rawType) || GRIDSTER_ALLOWED_POST_VIDEO_TYPES.includes(rawType)) {
    return rawType;
  }

  if (INFERABLE_VIDEO_MIME_TYPES.has(rawType)) {
    return VIDEO_MIME_BY_EXTENSION[fileExtension(file?.name)] || rawType;
  }

  return rawType;
}

export function isGridsterVideoMediaUrl(url) {
  const value = String(url || "").trim();

  if (!value) {
    return false;
  }

  try {
    const extension = fileExtension(new URL(value, "https://gridster.local").pathname);
    return VIDEO_URL_EXTENSIONS.has(extension);
  } catch {
    return false;
  }
}

export function validateGridsterPostPhoto(file) {
  if (!GRIDSTER_ALLOWED_POST_PHOTO_TYPES.includes(file.type)) {
    throw new Error("Please choose a PNG, JPEG, WEBP, or GIF image.");
  }

  if (file.size > GRIDSTER_MAX_POST_PHOTO_BYTES) {
    throw new Error("Images must be 8MB or smaller.");
  }
}

export function validateGridsterPostMedia(file) {
  const contentType = resolveGridsterPostMediaType(file);
  const isVideo = GRIDSTER_ALLOWED_POST_VIDEO_TYPES.includes(contentType);
  const isImage = GRIDSTER_ALLOWED_POST_PHOTO_TYPES.includes(contentType);

  if (!isVideo && !isImage) {
    throw new Error("Please choose a PNG, JPEG, WEBP, or GIF image, or an MP4 or WEBM video.");
  }

  if (isImage && file.size > GRIDSTER_MAX_POST_PHOTO_BYTES) {
    throw new Error("Images must be 8MB or smaller.");
  }

  if (isVideo && file.size > GRIDSTER_MAX_POST_VIDEO_BYTES) {
    throw new Error("Videos must be 50MB or smaller.");
  }

  return contentType;
}

async function uploadToPostPhotosBucket(userId, file, contentType, fallbackMessage) {
  const extension = POST_MEDIA_EXTENSIONS_BY_TYPE[contentType] || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(GRIDSTER_POST_PHOTOS_BUCKET)
    .upload(path, file, { contentType });

  if (uploadError) {
    throw new Error(uploadError.message || fallbackMessage);
  }

  const { data } = supabase.storage.from(GRIDSTER_POST_PHOTOS_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}

export async function uploadGridsterPostPhoto(userId, file) {
  validateGridsterPostPhoto(file);

  return uploadToPostPhotosBucket(
    userId,
    file,
    file.type,
    "Could not upload that image. Please try again."
  );
}

export async function uploadGridsterPostMedia(userId, file) {
  const contentType = validateGridsterPostMedia(file);

  return uploadToPostPhotosBucket(
    userId,
    file,
    contentType,
    "Could not upload that file. Please try again."
  );
}

export const GRIDSTER_GROUP_PHOTOS_BUCKET = "group-photos";
export const GRIDSTER_MAX_GROUP_PHOTO_BYTES = 8 * 1024 * 1024;
export const GRIDSTER_ALLOWED_GROUP_PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function validateGridsterGroupPhoto(file) {
  if (!GRIDSTER_ALLOWED_GROUP_PHOTO_TYPES.includes(file.type)) {
    throw new Error("Please choose a PNG, JPEG, WEBP, or GIF image.");
  }

  if (file.size > GRIDSTER_MAX_GROUP_PHOTO_BYTES) {
    throw new Error("Images must be 8MB or smaller.");
  }
}

export async function uploadGridsterGroupPhoto(userId, file) {
  validateGridsterGroupPhoto(file);

  const extension = POST_MEDIA_EXTENSIONS_BY_TYPE[file.type] || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(GRIDSTER_GROUP_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    throw new Error(uploadError.message || "Could not upload that image. Please try again.");
  }

  const { data } = supabase.storage.from(GRIDSTER_GROUP_PHOTOS_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}
