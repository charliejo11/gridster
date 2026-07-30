import { describe, expect, it } from "vitest";
import { normalizeGroupForm, normalizeGroupPostForm } from "./gridsterGroups.js";

describe("normalizeGroupForm", () => {
  it("trims whitespace from text fields", () => {
    const result = normalizeGroupForm({ name: "  My Group  ", description: "  hi  " });

    expect(result.name).toBe("My Group");
    expect(result.description).toBe("hi");
  });

  it("falls back to the 'community' category for an invalid/unknown category", () => {
    expect(normalizeGroupForm({ category: "not-a-real-category" }).category).toBe("community");
  });

  it("keeps a valid category as-is", () => {
    expect(normalizeGroupForm({ category: "roleplay" }).category).toBe("roleplay");
  });

  it("defaults maturity_rating to 'general' when invalid", () => {
    expect(normalizeGroupForm({ maturity_rating: "not-real" }).maturity_rating).toBe("general");
  });

  it("only ever writes privacy as 'public' or 'private', defaulting to public", () => {
    expect(normalizeGroupForm({}).privacy).toBe("public");
    expect(normalizeGroupForm({ privacy: "private" }).privacy).toBe("private");
    expect(normalizeGroupForm({ privacy: "anything-else" }).privacy).toBe("public");
  });

  it("adds https:// to a bare domain photo_url but leaves a full URL alone", () => {
    expect(normalizeGroupForm({ photo_url: "example.com/pic.png" }).photo_url).toBe("https://example.com/pic.png");
    expect(normalizeGroupForm({ photo_url: "http://example.com/pic.png" }).photo_url).toBe("http://example.com/pic.png");
  });
});

describe("normalizeGroupPostForm", () => {
  it("falls back to post_type 'post' for an invalid type", () => {
    expect(normalizeGroupPostForm({ post_type: "not-real" }).post_type).toBe("post");
  });

  it("keeps a valid post_type as-is", () => {
    expect(normalizeGroupPostForm({ post_type: "announcement" }).post_type).toBe("announcement");
  });

  it("trims content", () => {
    expect(normalizeGroupPostForm({ content: "  hello world  " }).content).toBe("hello world");
  });
});
