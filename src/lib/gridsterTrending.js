// Organic Trending + the capped, clearly-separate boost visibility
// bonus. This module is the one place that decides what "Trending"
// means on Gridster - it never reads bits_spent, package_type, or
// anything else about a boost purchase. Boost spend only ever
// contributes through computeBoostVisibilityBonus, which is capped
// and combined into a *different*, explicitly-named number
// (final_discovery_score) that is never displayed or referred to as
// "Trending".

// Diminishing-returns normalization: quickly rewards the first few
// genuine engagers, then flattens out so a post can't buy an
// unbounded score just by racking up more of the same signal.
function saturate(count, halfSaturation) {
  const value = Math.max(0, Number(count) || 0);
  return value / (value + halfSaturation);
}

export const TRENDING_WEIGHTS = {
  growth: 0.3,
  comments: 0.2,
  saves: 0.15,
  shares: 0.15,
  clicks: 0.1,
  freshness: 0.1,
};

const GROWTH_HALF_SATURATION = 3; // recent (48h) engagements-per-hour
const COMMENTS_HALF_SATURATION = 5;
const SAVES_HALF_SATURATION = 5;
const SHARES_HALF_SATURATION = 3;
const CLICKS_HALF_SATURATION = 8;
const FRESHNESS_WINDOW_HOURS = 72;

// The single cap that keeps boosting honest: a boosted post's bonus
// can never exceed this fraction of the strongest organic score in
// the current candidate set, regardless of package tier or spend.
export const BOOST_VISIBILITY_BONUS_CAP_RATIO = 0.12;

function hoursSince(dateString) {
  if (!dateString) {
    return 0;
  }

  return Math.max(0, (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60));
}

// Returns { organicTrendingScore, breakdown } - 0..100. Reads only
// real, unique-user-deduplicated, creator-self-engagement-excluded
// counts from gridster_post_engagement_stats (see gridsterEngagement.js).
// Never reads anything boost-related.
export function computeOrganicTrendingScore(post, stats) {
  const ageHours = hoursSince(post?.created_at);
  const recentPerHour = stats ? (stats.recent_engagement_count || 0) / Math.max(ageHours, 1) : 0;

  const growth = saturate(recentPerHour, GROWTH_HALF_SATURATION);
  const comments = saturate(stats?.comment_count, COMMENTS_HALF_SATURATION);
  const saves = saturate(stats?.save_count, SAVES_HALF_SATURATION);
  const shares = saturate(stats?.share_count, SHARES_HALF_SATURATION);
  const clicks = saturate(
    (stats?.profile_click_count || 0) + (stats?.teleport_click_count || 0),
    CLICKS_HALF_SATURATION
  );
  const freshness = Math.max(0, 1 - ageHours / FRESHNESS_WINDOW_HOURS);

  const organicTrendingScore =
    100 *
    (TRENDING_WEIGHTS.growth * growth +
      TRENDING_WEIGHTS.comments * comments +
      TRENDING_WEIGHTS.saves * saves +
      TRENDING_WEIGHTS.shares * shares +
      TRENDING_WEIGHTS.clicks * clicks +
      TRENDING_WEIGHTS.freshness * freshness);

  return {
    organicTrendingScore,
    breakdown: { growth, comments, saves, shares, clicks, freshness },
  };
}

// A currently-active boost may add a small, capped discovery bonus.
// `organicScoreCeiling` is the strongest organic_trending_score
// among the current candidate set - the bonus is a fraction of that,
// never an unbounded function of bits_spent, so more spend cannot
// create an unlimited score and a zero-engagement boosted post can't
// outrank strongly-engaging organic content.
export function computeBoostVisibilityBonus(hasActiveBoost, organicScoreCeiling) {
  if (!hasActiveBoost || !(organicScoreCeiling > 0)) {
    return 0;
  }

  return BOOST_VISIBILITY_BONUS_CAP_RATIO * organicScoreCeiling;
}

export function computeFinalDiscoveryScore(organicTrendingScore, boostVisibilityBonus) {
  return organicTrendingScore + boostVisibilityBonus;
}

// Replaces the hardcoded gridsterTrendingTopics array. Purely
// organic - tag scores are the sum of each tagged post's
// organic_trending_score, boost spend never enters this at all.
export function computeOrganicTrendingTags(posts, statsByPostId, limit = 6) {
  const tagScores = new Map();

  for (const post of posts || []) {
    const stats = statsByPostId?.get(post.id);
    const { organicTrendingScore } = computeOrganicTrendingScore(post, stats);

    for (const rawTag of post.tags || []) {
      const tag = String(rawTag || "").trim();

      if (!tag) {
        continue;
      }

      const key = tag.toLowerCase();
      const entry = tagScores.get(key) || { tag: tag.startsWith("#") ? tag : `#${tag}`, score: 0, posts: 0 };
      entry.score += organicTrendingScore;
      entry.posts += 1;
      tagScores.set(key, entry);
    }
  }

  return [...tagScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => [entry.tag, `${entry.posts} post${entry.posts === 1 ? "" : "s"}`]);
}

// ---------------------------------------------------------------------------
// Feed insertion (section 7) - boosted posts are interleaved as
// *additional* slots after organic ranking/filtering has already
// happened; they never rerank the organic list itself.
// ---------------------------------------------------------------------------

const SESSION_SHOWN_BOOSTS_KEY = "gridster:sessionShownBoostIds";
const SESSION_SHOWN_BOOSTS_MAX = 50;

// "Don't show the same boosted post repeatedly in a short session" -
// a small sessionStorage-backed memory, not a server-side concept.
export function readSessionShownBoostIds() {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_SHOWN_BOOSTS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function rememberSessionShownBoostId(boostId) {
  if (typeof window === "undefined" || !boostId) {
    return;
  }

  try {
    const current = [...readSessionShownBoostIds()];
    current.push(boostId);
    window.sessionStorage.setItem(
      SESSION_SHOWN_BOOSTS_KEY,
      JSON.stringify(current.slice(-SESSION_SHOWN_BOOSTS_MAX))
    );
  } catch {
    // Best-effort only - never blocks feed rendering.
  }
}

const DEFAULT_MIN_GAP = 6;
const DEFAULT_MAX_GAP = 10;

export function interleaveBoostedPosts(organicPosts, boostCandidates, options = {}) {
  const {
    currentUserId = null,
    mutedUserIds = new Set(),
    blockedUserIds = new Set(),
    sessionShownBoostIds = new Set(),
    minGap = DEFAULT_MIN_GAP,
    maxGap = DEFAULT_MAX_GAP,
    maxPerCreatorPerWindow = 1,
  } = options;

  if (!organicPosts?.length) {
    return [];
  }

  // Every post's own natural slot in the feed reflects its true boosted
  // state, for any viewer, regardless of the extra-slot mechanism below -
  // otherwise a freshly-boosted post never shows "Boosted" (or loses its
  // Boost button) anywhere near where the viewer is actually looking at it.
  const boostByPostId = new Map(
    (boostCandidates || [])
      .filter(({ post }) => Boolean(post))
      .map(({ post, boost }) => [post.id, boost])
  );

  const baseEntries = organicPosts.map((post) => ({
    post,
    boosted: boostByPostId.has(post.id),
    boost: boostByPostId.get(post.id) || null,
  }));

  // The extra-slot insertion is purely additive reach on top of that -
  // exclude the viewer's own posts here (not above) so self-views never
  // pad out extra paid impressions, while the label itself still shows
  // correctly to the owner at the post's real position.
  const eligibleForExtraSlot = (boostCandidates || []).filter(({ post }) => {
    if (!post) return false;
    if (currentUserId && post.user_id === currentUserId) return false;
    if (mutedUserIds.has(post.user_id) || blockedUserIds.has(post.user_id)) return false;
    return true;
  });

  if (!eligibleForExtraSlot.length) {
    return baseEntries;
  }

  const notShownYet = eligibleForExtraSlot.filter(({ boost }) => !sessionShownBoostIds.has(boost.boost_id));
  const pool = notShownYet.length ? notShownYet : eligibleForExtraSlot;

  const gap = minGap + Math.floor(Math.random() * (maxGap - minGap + 1));
  const creatorCounts = new Map();
  const result = [];

  let poolIndex = 0;
  let sinceLastBoost = 0;

  for (const entry of baseEntries) {
    result.push(entry);
    sinceLastBoost += 1;

    if (sinceLastBoost < gap || poolIndex >= pool.length) {
      continue;
    }

    for (let attempts = 0; attempts < pool.length; attempts += 1) {
      const candidate = pool[poolIndex % pool.length];
      poolIndex += 1;

      const creatorId = candidate.post.user_id;
      const usedForCreator = creatorCounts.get(creatorId) || 0;

      if (usedForCreator < maxPerCreatorPerWindow) {
        creatorCounts.set(creatorId, usedForCreator + 1);
        result.push({ post: candidate.post, boosted: true, boost: candidate.boost });
        sinceLastBoost = 0;
        break;
      }
    }
  }

  return result;
}
