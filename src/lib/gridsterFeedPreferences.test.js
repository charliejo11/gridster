import { describe, expect, it } from "vitest";
import { rankAndFilterPosts } from "./gridsterFeedPreferences.js";

function makePost(overrides = {}) {
  return {
    id: overrides.id || Math.random().toString(36).slice(2),
    user_id: "author-1",
    post_type: "post",
    maturity_rating: "general",
    created_at: new Date().toISOString(),
    tags: [],
    ...overrides,
  };
}

describe("rankAndFilterPosts", () => {
  it("filters out posts the viewer has hidden", () => {
    const hidden = makePost({ id: "hidden" });
    const visible = makePost({ id: "visible" });

    const result = rankAndFilterPosts([hidden, visible], { hiddenPostIds: new Set(["hidden"]) });

    expect(result.map((p) => p.id)).toEqual(["visible"]);
  });

  it("filters out posts from muted authors", () => {
    const muted = makePost({ id: "muted-post", user_id: "muted-author" });
    const other = makePost({ id: "other-post", user_id: "other-author" });

    const result = rankAndFilterPosts([muted, other], { mutedUserIds: new Set(["muted-author"]) });

    expect(result.map((p) => p.id)).toEqual(["other-post"]);
  });

  it("filters out posts from blocked authors", () => {
    const blocked = makePost({ id: "blocked-post", user_id: "blocked-author" });
    const other = makePost({ id: "other-post", user_id: "other-author" });

    const result = rankAndFilterPosts([blocked, other], { blockedUserIds: new Set(["blocked-author"]) });

    expect(result.map((p) => p.id)).toEqual(["other-post"]);
  });

  it("filters out posts whose maturity rating isn't in the allowed set", () => {
    const adult = makePost({ id: "adult-post", maturity_rating: "adult" });
    const general = makePost({ id: "general-post", maturity_rating: "general" });

    const result = rankAndFilterPosts([adult, general], { preferences: { ratings: ["general"] } });

    expect(result.map((p) => p.id)).toEqual(["general-post"]);
  });

  it("defaults to general+moderate ratings when no preferences are given", () => {
    const adult = makePost({ id: "adult-post", maturity_rating: "adult" });
    const moderate = makePost({ id: "moderate-post", maturity_rating: "moderate" });

    const result = rankAndFilterPosts([adult, moderate]);

    expect(result.map((p) => p.id)).toEqual(["moderate-post"]);
  });

  it("boosts posts of a 'show more' content type above others", () => {
    const older = makePost({ id: "blog-post", post_type: "blog", created_at: new Date(Date.now() - 10000).toISOString() });
    const newer = makePost({ id: "plain-post", post_type: "post", created_at: new Date().toISOString() });

    // Without preference, newer sorts first (tiebreaker is recency).
    const withoutPref = rankAndFilterPosts([older, newer]);
    expect(withoutPref[0].id).toBe("plain-post");

    // With "show more Blogger Posts", the older blog post should now outrank the newer plain post.
    const withPref = rankAndFilterPosts([older, newer], {
      preferences: { show_more: ["Blogger Posts"], ratings: ["general", "moderate"] },
    });
    expect(withPref[0].id).toBe("blog-post");
  });

  it("demotes posts of a 'show less' content type", () => {
    const store = makePost({ id: "store-post", post_type: "store" });
    const plain = makePost({ id: "plain-post", post_type: "post" });

    const result = rankAndFilterPosts([store, plain], {
      preferences: { show_less: ["Store Releases"], ratings: ["general", "moderate"] },
    });

    expect(result[0].id).toBe("plain-post");
  });

  it("boosts posts from friends when Discovery Focus includes Friends", () => {
    const friendPost = makePost({ id: "friend-post", user_id: "friend-1", created_at: new Date(Date.now() - 10000).toISOString() });
    const strangerPost = makePost({ id: "stranger-post", user_id: "stranger-1" });

    const result = rankAndFilterPosts([friendPost, strangerPost], {
      preferences: { discovery_focus: ["Friends"], ratings: ["general", "moderate"] },
      friendUserIds: new Set(["friend-1"]),
    });

    expect(result[0].id).toBe("friend-post");
  });

  it("falls back to newest-first when scores tie", () => {
    const older = makePost({ id: "older", created_at: new Date(Date.now() - 100000).toISOString() });
    const newer = makePost({ id: "newer", created_at: new Date().toISOString() });

    const result = rankAndFilterPosts([older, newer]);

    expect(result.map((p) => p.id)).toEqual(["newer", "older"]);
  });

  it("never lets a boost bonus override the preference-based score ordering", () => {
    // A strongly-preferred post with zero engagement/boost must still
    // outrank a non-preferred post even if that post has an active boost -
    // boosts are only ever a tiebreaker below the preference score.
    const preferred = makePost({ id: "preferred", post_type: "blog" });
    const boostedNonPreferred = makePost({ id: "boosted", post_type: "store" });

    const result = rankAndFilterPosts([boostedNonPreferred, preferred], {
      preferences: { show_more: ["Blogger Posts"], show_less: ["Store Releases"], ratings: ["general", "moderate"] },
      activeBoostsByPostId: new Map([["boosted", { boost_id: "b1" }]]),
      engagementStatsByPostId: new Map(),
    });

    expect(result[0].id).toBe("preferred");
  });
});
