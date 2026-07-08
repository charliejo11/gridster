import { supabase } from "./supabaseClient";

export const GRIDSTER_POST_PHOTOS_BUCKET = "post-photos";
export const GRIDSTER_MAX_POST_PHOTO_BYTES = 8 * 1024 * 1024;
export const GRIDSTER_ALLOWED_POST_PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const POST_PHOTO_EXTENSIONS_BY_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function validateGridsterPostPhoto(file) {
  if (!GRIDSTER_ALLOWED_POST_PHOTO_TYPES.includes(file.type)) {
    throw new Error("Please choose a PNG, JPEG, WEBP, or GIF image.");
  }

  if (file.size > GRIDSTER_MAX_POST_PHOTO_BYTES) {
    throw new Error("Images must be 8MB or smaller.");
  }
}

export async function uploadGridsterPostPhoto(userId, file) {
  validateGridsterPostPhoto(file);

  const extension = POST_PHOTO_EXTENSIONS_BY_TYPE[file.type] || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(GRIDSTER_POST_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    throw new Error(uploadError.message || "Could not upload that image. Please try again.");
  }

  const { data } = supabase.storage.from(GRIDSTER_POST_PHOTOS_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}
