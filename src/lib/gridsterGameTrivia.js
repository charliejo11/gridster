import { supabase } from "./supabaseClient";

export const GRIDSTER_GAME_TRIVIA_CATEGORIES_TABLE = "gridster_game_trivia_categories";
export const GRIDSTER_GAME_TRIVIA_ATTEMPTS_TABLE = "gridster_game_trivia_attempts";
export const GRIDSTER_GAME_TRIVIA_DAILY_SCORES_TABLE = "gridster_game_trivia_daily_scores";

export async function fetchTriviaCategories() {
  const { data, error } = await supabase
    .from(GRIDSTER_GAME_TRIVIA_CATEGORIES_TABLE)
    .select("id, slug, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function startTriviaAttempt({ categorySlug = null, difficulty = null, mode = "practice" } = {}) {
  const { data, error } = await supabase.rpc("start_trivia_attempt", {
    target_category_slug: categorySlug,
    target_difficulty: difficulty,
    target_mode: mode,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function submitTriviaAnswer(attemptId, choiceKey) {
  const { data, error } = await supabase.rpc("submit_trivia_answer", {
    target_attempt_id: attemptId,
    chosen_choice_key: choiceKey,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchMyTriviaHistory(userId, limit = 30) {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from(GRIDSTER_GAME_TRIVIA_ATTEMPTS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function fetchTriviaDailyLeaderboard(challengeDate) {
  const targetDate = challengeDate || new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from(GRIDSTER_GAME_TRIVIA_DAILY_SCORES_TABLE)
    .select("user_id, score, correct_count")
    .eq("challenge_date", targetDate)
    .order("score", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return data || [];
}

// All-time leaderboard aggregates every daily score row per user. Small
// enough at MVP scale to compute client-side from the public table rather
// than needing a server-side view.
export async function fetchTriviaAllTimeLeaderboard() {
  const { data, error } = await supabase
    .from(GRIDSTER_GAME_TRIVIA_DAILY_SCORES_TABLE)
    .select("user_id, score, correct_count");

  if (error) {
    throw error;
  }

  const totalsByUser = new Map();

  for (const row of data || []) {
    const existing = totalsByUser.get(row.user_id) || { user_id: row.user_id, score: 0, correct_count: 0 };
    existing.score += row.score;
    existing.correct_count += row.correct_count;
    totalsByUser.set(row.user_id, existing);
  }

  return [...totalsByUser.values()].sort((a, b) => b.score - a.score).slice(0, 20);
}

export function formatTimeRemaining(expiresAtIso) {
  const remainingMs = new Date(expiresAtIso).getTime() - Date.now();

  if (remainingMs <= 0) {
    return "Time's up";
  }

  const seconds = Math.ceil(remainingMs / 1000);
  return `${seconds}s`;
}

export function difficultyLabel(difficulty) {
  switch (difficulty) {
    case "easy":
      return "Easy";
    case "medium":
      return "Medium";
    case "hard":
      return "Hard";
    default:
      return difficulty || "";
  }
}
