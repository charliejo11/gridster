import { describe, expect, it } from "vitest";
import {
  BOOST_VISIBILITY_BONUS_CAP_RATIO,
  computeBoostVisibilityBonus,
  computeFinalDiscoveryScore,
  computeOrganicTrendingScore,
  computeOrganicTrendingTags,
  interleaveBoostedPosts,
} from "./gridsterTrending.js";

describe("computeOrganicTrendingScore", () => {
  it("gives a fresh, zero-engagement post a non-zero score from freshness alone", () => {
    const { organicTrendingScore } = computeOrganicTrendingScore(
      { created_at: new Date().toISOString() },
      null
    );

    expect(organicTrendingScore).toBeGreaterThan(0);
    expect(organicTrendingScore).toBeLessThanOrEqual(100);
  });

  it("scores a post past the freshness window with no engagement as 0", () => {
    const oldDate = new Date(Date.now() - 200 * 60 * 60 * 1000).toISOString();
    const { organicTrendingScore } = computeOrganicTrendingScore({ created_at: oldDate }, null);

    expect(organicTrendingScore).toBe(0);
  });

  it("never exceeds 100 even with extreme engagement counts", () => {
    const { organicTrendingScore } = computeOrganicTrendingScore(
      { created_at: new Date().toISOString() },
      {
        recent_engagement_count: 1_000_000,
        comment_count: 1_000_000,
        save_count: 1_000_000,
        share_count: 1_000_000,
        profile_click_count: 1_000_000,
        teleport_click_count: 1_000_000,
      }
    );

    expect(organicTrendingScore).toBeLessThanOrEqual(100);
  });

  it("gives more engagement a strictly higher score than less engagement, all else equal", () => {
    const post = { created_at: new Date().toISOString() };
    const low = computeOrganicTrendingScore(post, { comment_count: 1 });
    const high = computeOrganicTrendingScore(post, { comment_count: 20 });

    expect(high.organicTrendingScore).toBeGreaterThan(low.organicTrendingScore);
  });
});

describe("computeBoostVisibilityBonus", () => {
  it("is 0 with no active boost, regardless of organic ceiling", () => {
    expect(computeBoostVisibilityBonus(false, 80)).toBe(0);
  });

  it("is 0 when the organic ceiling is 0 (nothing to boost off of)", () => {
    expect(computeBoostVisibilityBonus(true, 0)).toBe(0);
  });

  it("is capped at BOOST_VISIBILITY_BONUS_CAP_RATIO of the organic ceiling", () => {
    const ceiling = 50;
    const bonus = computeBoostVisibilityBonus(true, ceiling);

    expect(bonus).toBe(ceiling * BOOST_VISIBILITY_BONUS_CAP_RATIO);
  });

  it("a boosted zero-engagement post can never outrank a strongly-engaging organic post", () => {
    // This is the actual product invariant the cap exists to protect -
    // regressing this would let paid spend buy an unbounded ranking.
    const organicCeiling = 90;
    const boostedZeroEngagementScore = 0 + computeBoostVisibilityBonus(true, organicCeiling);

    expect(boostedZeroEngagementScore).toBeLessThan(organicCeiling);
  });
});

describe("computeFinalDiscoveryScore", () => {
  it("is the plain sum of organic score and boost bonus", () => {
    expect(computeFinalDiscoveryScore(40, 5)).toBe(45);
  });
});

describe("computeOrganicTrendingTags", () => {
  it("ranks tags by summed organic score across posts, highest first", () => {
    const now = new Date().toISOString();
    const posts = [
      { id: "1", created_at: now, tags: ["popular"] },
      { id: "2", created_at: now, tags: ["popular"] },
      { id: "3", created_at: now, tags: ["rare"] },
    ];

    const tags = computeOrganicTrendingTags(posts, new Map());

    expect(tags[0][0]).toBe("#popular");
    expect(tags[0][1]).toBe("2 posts");
  });

  it("normalizes tags case-insensitively and always prefixes with #", () => {
    const now = new Date().toISOString();
    const posts = [
      { id: "1", created_at: now, tags: ["Fashion"] },
      { id: "2", created_at: now, tags: ["fashion"] },
    ];

    const tags = computeOrganicTrendingTags(posts, new Map());

    expect(tags).toHaveLength(1);
    expect(tags[0][1]).toBe("2 posts");
  });

  it("respects the limit parameter", () => {
    const now = new Date().toISOString();
    const posts = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      created_at: now,
      tags: [`tag${i}`],
    }));

    expect(computeOrganicTrendingTags(posts, new Map(), 3)).toHaveLength(3);
  });
});

describe("interleaveBoostedPosts", () => {
  const makePosts = (n) => Array.from({ length: n }, (_, i) => ({ id: `post-${i}`, user_id: `author-${i}` }));

  it("returns an empty array when there are no organic posts", () => {
    expect(interleaveBoostedPosts([], [])).toEqual([]);
  });

  it("returns every organic post, unboosted, when there are no boost candidates", () => {
    const posts = makePosts(5);
    const result = interleaveBoostedPosts(posts, []);

    expect(result).toHaveLength(5);
    expect(result.every((entry) => entry.boosted === false)).toBe(true);
  });

  it("marks a post's natural slot as boosted if it has an active boost, even without extra insertion", () => {
    const posts = makePosts(3);
    const boost = { boost_id: "b1" };
    const result = interleaveBoostedPosts(posts, [{ post: posts[0], boost }]);

    const naturalSlot = result.find((entry) => entry.post.id === posts[0].id);
    expect(naturalSlot.boosted).toBe(true);
  });

  it("never gives the viewer's own boosted post an extra promotional slot", () => {
    const posts = makePosts(20);
    const ownPost = posts[0];
    const boost = { boost_id: "own-boost" };

    const result = interleaveBoostedPosts(posts, [{ post: ownPost, boost }], {
      currentUserId: ownPost.user_id,
      minGap: 1,
      maxGap: 1,
    });

    // Only the one natural slot should reference this post - no
    // additional inserted copy anywhere in the result.
    const occurrences = result.filter((entry) => entry.post.id === ownPost.id);
    expect(occurrences).toHaveLength(1);
  });

  it("excludes boost candidates from muted or blocked authors from getting an extra slot", () => {
    const posts = makePosts(20);
    const blockedPost = { id: "blocked-post", user_id: "blocked-author" };
    const boost = { boost_id: "blocked-boost" };

    const result = interleaveBoostedPosts(posts, [{ post: blockedPost, boost }], {
      blockedUserIds: new Set(["blocked-author"]),
      minGap: 1,
      maxGap: 1,
    });

    expect(result.some((entry) => entry.post.id === "blocked-post")).toBe(false);
  });
});
