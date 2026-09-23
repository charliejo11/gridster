export const REACTION_ROUNDS = 3;
export const REACTION_MIN_DELAY_MS = 1400;
export const REACTION_MAX_DELAY_MS = 3400;

export const LANDMARK_MATCH_ROUNDS = [
  {
    id: "beach",
    prompt: "🏖️ Sunset boardwalk, a bonfire, and a beach DJ.",
    choices: ["Beach club", "Combat sandbox", "Skybox gallery", "Infohub"],
    answer: "Beach club",
  },
  {
    id: "dance",
    prompt: "🎶 Midnight dance floor, a DJ booth, and a tip jar.",
    choices: ["Dance club", "Marina", "Residential neighborhood", "Nature sim"],
    answer: "Dance club",
  },
  {
    id: "mall",
    prompt: "🛍️ Rows of vendor boards and a mall directory.",
    choices: ["Shopping region", "Cafe hangout", "Beach club", "Skybox gallery"],
    answer: "Shopping region",
  },
  {
    id: "nature",
    prompt: "🌲 Quiet trails, a waterfall, and a photo bench.",
    choices: ["Nature sim", "Dance club", "Combat sandbox", "Shopping region"],
    answer: "Nature sim",
  },
  {
    id: "home",
    prompt: "🏠 Matching cottages, a community dock, and a Linden Home vibe.",
    choices: ["Residential neighborhood", "Infohub", "Marina", "Dance club"],
    answer: "Residential neighborhood",
  },
  {
    id: "skybox",
    prompt: "🌙 A platform high above the ground, reached by a skybox teleport.",
    choices: ["Skybox gallery", "Beach club", "Cafe hangout", "Nature sim"],
    answer: "Skybox gallery",
  },
];

// Short original clues from public grid facts. The answer is the region
// name that completes the SLURL-style hint.
export const REGION_GUESS_ROUNDS = [
  {
    id: "da-boom",
    prompt: "SLURL hint: /secondlife/________ — the first region on the grid, opened in 2002 and named for a San Francisco street.",
    choices: ["Da Boom", "Waterhead", "Ahern", "Clementina"],
    answer: "Da Boom",
  },
  {
    id: "waterhead",
    prompt: "An old welcome area of woods and water. Fill the region: /secondlife/________.",
    choices: ["Waterhead", "Da Boom", "Clementina", "Ahern"],
    answer: "Waterhead",
  },
  {
    id: "ahern",
    prompt: "One of the oldest welcome areas, known for busy local chat. The maps link uses /secondlife/________.",
    choices: ["Ahern", "Clementina", "Waterhead", "Da Boom"],
    answer: "Ahern",
  },
  {
    id: "clementina",
    prompt: "Governor Linden's mansion sits in this heritage region. The SLURL region is ________.",
    choices: ["Clementina", "Ahern", "Da Boom", "Waterhead"],
    answer: "Clementina",
  },
];

export function shuffleItems(items, random = Math.random) {
  const copy = [...(items || [])];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }

  return copy;
}

export function isCorrectChoice(round, choice) {
  return Boolean(round) && choice === round.answer;
}

export function reactionDelayMs(random = Math.random) {
  const span = REACTION_MAX_DELAY_MS - REACTION_MIN_DELAY_MS;
  const unit = Math.min(Math.max(Number(random()) || 0, 0), 0.999999);
  return REACTION_MIN_DELAY_MS + Math.floor(unit * (span + 1));
}

export function scoreReactionTap({ wentLive = false, tappedAt = null, liveAt = null } = {}) {
  if (!wentLive || typeof tappedAt !== "number" || typeof liveAt !== "number" || tappedAt < liveAt) {
    return {
      tooSoon: true,
      ms: null,
      points: 0,
      label: "Too soon — the sim was still rezzing.",
    };
  }

  const ms = tappedAt - liveAt;

  if (ms < 180) {
    return { tooSoon: false, ms, points: 100, label: "Grid-fast" };
  }

  if (ms < 320) {
    return { tooSoon: false, ms, points: 70, label: "Smooth TP" };
  }

  if (ms < 550) {
    return { tooSoon: false, ms, points: 40, label: "A little lag" };
  }

  return { tooSoon: false, ms, points: 15, label: "Rubber banding" };
}

export function sumReactionPoints(results) {
  return (results || []).reduce((sum, result) => sum + (result?.points || 0), 0);
}
