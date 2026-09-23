import { beforeEach, describe, expect, it, vi } from "vitest";

const { upload, getPublicUrl, from } = vi.hoisted(() => {
  const upload = vi.fn();
  const getPublicUrl = vi.fn();
  const from = vi.fn(() => ({
    upload,
    getPublicUrl,
  }));

  return { upload, getPublicUrl, from };
});

vi.mock("./supabaseClient.js", () => ({
  supabase: {
    storage: {
      from,
    },
  },
}));

import {
  GRIDSTER_ALLOWED_POST_PHOTO_TYPES,
  GRIDSTER_MAX_POST_PHOTO_BYTES,
  GRIDSTER_MAX_POST_VIDEO_BYTES,
  GRIDSTER_POST_MEDIA_ACCEPT,
  GRIDSTER_POST_PHOTOS_BUCKET,
  isGridsterVideoMediaUrl,
  resolveGridsterPostMediaType,
  uploadGridsterPostMedia,
  uploadGridsterPostPhoto,
  validateGridsterPostMedia,
  validateGridsterPostPhoto,
} from "./gridsterMediaUploads.js";

function mediaFile({ type = "", size = 1024, name = "clip.mp4" } = {}) {
  return { type, size, name };
}

describe("Home post media MIME accept", () => {
  it("keeps the image picker types and adds mp4 and webm", () => {
    for (const type of GRIDSTER_ALLOWED_POST_PHOTO_TYPES) {
      expect(GRIDSTER_POST_MEDIA_ACCEPT).toContain(type);
    }

    expect(GRIDSTER_POST_MEDIA_ACCEPT).toContain("video/mp4");
    expect(GRIDSTER_POST_MEDIA_ACCEPT).toContain("video/webm");
    expect(GRIDSTER_POST_MEDIA_ACCEPT).not.toContain("video/quicktime");
  });

  it("accepts png, jpeg, webp, and gif at the existing 8MB image cap", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif"]) {
      expect(validateGridsterPostMedia(mediaFile({ type, size: GRIDSTER_MAX_POST_PHOTO_BYTES, name: "shot.png" }))).toBe(type);
      expect(() => validateGridsterPostPhoto(mediaFile({ type, size: GRIDSTER_MAX_POST_PHOTO_BYTES, name: "shot.png" }))).not.toThrow();
    }
  });

  it("still rejects images over 8MB", () => {
    const file = mediaFile({ type: "image/png", size: GRIDSTER_MAX_POST_PHOTO_BYTES + 1, name: "big.png" });

    expect(() => validateGridsterPostMedia(file)).toThrow(/8MB/);
    expect(() => validateGridsterPostPhoto(file)).toThrow(/8MB/);
  });

  it("accepts video/mp4 and video/webm above the image cap and up to 50MB", () => {
    expect(validateGridsterPostMedia(mediaFile({
      type: "video/mp4",
      size: GRIDSTER_MAX_POST_PHOTO_BYTES + 1,
      name: "tiktok.mp4",
    }))).toBe("video/mp4");

    expect(validateGridsterPostMedia(mediaFile({
      type: "video/webm",
      size: GRIDSTER_MAX_POST_VIDEO_BYTES,
      name: "clip.webm",
    }))).toBe("video/webm");
  });

  it("rejects videos over 50MB", () => {
    expect(() => validateGridsterPostMedia(mediaFile({
      type: "video/mp4",
      size: GRIDSTER_MAX_POST_VIDEO_BYTES + 1,
      name: "long.mp4",
    }))).toThrow(/50MB/);
  });

  it("rejects quicktime mov uploads", () => {
    expect(() => validateGridsterPostMedia(mediaFile({
      type: "video/quicktime",
      name: "clip.mov",
    }))).toThrow(/MP4 or WEBM/);
  });

  it("infers mp4 when a TikTok download has an empty or generic MIME type", () => {
    expect(resolveGridsterPostMediaType(mediaFile({ type: "video/mp4;codecs=avc1", name: "clip.mp4" }))).toBe("video/mp4");
    expect(resolveGridsterPostMediaType(mediaFile({ type: "", name: "tiktok-video.mp4" }))).toBe("video/mp4");
    expect(validateGridsterPostMedia(mediaFile({
      type: "application/octet-stream",
      name: "tiktok-video.MP4",
    }))).toBe("video/mp4");
    expect(validateGridsterPostMedia(mediaFile({
      type: "video/quicktime",
      name: "export.m4v",
    }))).toBe("video/mp4");
  });

  it("does not infer an image type from the filename when MIME is missing", () => {
    expect(() => validateGridsterPostMedia(mediaFile({ type: "", name: "cover.png" }))).toThrow(/MP4 or WEBM/);
  });

  it("keeps the image-only validator used by places and events", () => {
    expect(() => validateGridsterPostPhoto(mediaFile({ type: "video/mp4", name: "clip.mp4" }))).toThrow(/PNG, JPEG/);
  });
});

describe("post media URL branching", () => {
  it("treats mp4, m4v, and webm URLs as video and images as images", () => {
    expect(isGridsterVideoMediaUrl("https://cdn.example/post-photos/user/clip.mp4")).toBe(true);
    expect(isGridsterVideoMediaUrl("https://cdn.example/post-photos/user/clip.MP4?token=1")).toBe(true);
    expect(isGridsterVideoMediaUrl("https://cdn.example/post-photos/user/clip.webm")).toBe(true);
    expect(isGridsterVideoMediaUrl("https://cdn.example/post-photos/user/clip.m4v")).toBe(true);

    for (const extension of ["png", "jpg", "jpeg", "webp", "gif"]) {
      expect(isGridsterVideoMediaUrl(`https://cdn.example/post-photos/user/shot.${extension}`)).toBe(false);
    }

    expect(isGridsterVideoMediaUrl("https://cdn.example/watch/clip.mp4/poster.png")).toBe(false);
    expect(isGridsterVideoMediaUrl("https://cdn.example/clip.mov")).toBe(false);
    expect(isGridsterVideoMediaUrl("")).toBe(false);
  });
});

describe("post media upload", () => {
  beforeEach(() => {
    upload.mockReset();
    getPublicUrl.mockReset();
    from.mockClear();
    upload.mockResolvedValue({ error: null });
    getPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn.example/post-photos/user-1/clip.mp4" } });
  });

  it("stores an mp4 in the post-photos bucket and returns the public URL", async () => {
    const file = mediaFile({ type: "", size: 12 * 1024 * 1024, name: "tiktok.mp4" });

    await expect(uploadGridsterPostMedia("user-1", file)).resolves.toBe("https://cdn.example/post-photos/user-1/clip.mp4");

    expect(from).toHaveBeenCalledWith(GRIDSTER_POST_PHOTOS_BUCKET);
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/\d+-[a-z0-9]+\.mp4$/),
      file,
      { contentType: "video/mp4" }
    );
    expect(getPublicUrl).toHaveBeenCalledWith(expect.stringMatching(/\.mp4$/));
  });

  it("still uploads a jpeg with its image content type", async () => {
    const file = mediaFile({ type: "image/jpeg", size: 2000, name: "look.jpg" });

    await uploadGridsterPostPhoto("user-1", file);

    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/\d+-[a-z0-9]+\.jpg$/),
      file,
      { contentType: "image/jpeg" }
    );
  });

  it("does not upload when validation fails", async () => {
    const file = mediaFile({
      type: "video/mp4",
      size: GRIDSTER_MAX_POST_VIDEO_BYTES + 1,
      name: "long.mp4",
    });

    await expect(uploadGridsterPostMedia("user-1", file)).rejects.toThrow(/50MB/);
    expect(upload).not.toHaveBeenCalled();
  });

  it("surfaces the storage error from the post-photos bucket", async () => {
    upload.mockResolvedValue({ error: { message: "mime type video/mp4 is not supported" } });

    await expect(uploadGridsterPostMedia("user-1", mediaFile({ type: "video/mp4", name: "clip.mp4" }))).rejects.toThrow(/not supported/);
    expect(upload.mock.calls[0][0]).toBeTruthy();
    expect(GRIDSTER_POST_PHOTOS_BUCKET).toBe("post-photos");
  });
});
