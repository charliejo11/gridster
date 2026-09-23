import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabaseClient.js", () => ({
  supabase: {},
}));

import PostMedia from "./PostMedia.jsx";

describe("PostMedia playback branching", () => {
  it("renders a controlled video element for mp4 and webm, with no autoplay", () => {
    for (const url of [
      "https://cdn.example/post-photos/user/tiktok.mp4",
      "https://cdn.example/post-photos/user/clip.webm?token=1",
    ]) {
      const html = renderToStaticMarkup(createElement(PostMedia, { url }));

      expect(html).toContain("<video");
      expect(html).toContain("controls");
      expect(html.toLowerCase()).toContain("playsinline");
      expect(html).not.toContain("autoplay");
      expect(html).toContain(`src="${url}"`);
      expect(html).not.toContain("<img");
    }
  });

  it("renders an img for png, jpeg, webp, and gif", () => {
    for (const extension of ["png", "jpg", "jpeg", "webp", "gif"]) {
      const html = renderToStaticMarkup(createElement(PostMedia, {
        url: `https://cdn.example/post-photos/user/look.${extension}`,
        alt: "",
      }));

      expect(html).toContain("<img");
      expect(html).not.toContain("<video");
    }
  });

  it("can force a video element for a preview URL that has no file extension", () => {
    const html = renderToStaticMarkup(createElement(PostMedia, {
      url: "blob:http://localhost/preview",
      video: true,
      alt: "Selected preview",
    }));

    expect(html).toContain("<video");
    expect(html).toContain("controls");
    expect(html).not.toContain("autoplay");
  });

  it("omits controls for the small spotlight thumbnail", () => {
    const html = renderToStaticMarkup(createElement(PostMedia, {
      url: "https://cdn.example/post-photos/user/clip.mp4",
      controls: false,
    }));

    expect(html).toContain("<video");
    expect(html).not.toContain("controls");
    expect(html).not.toContain("autoplay");
  });
});
