import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { fetchAchievements, fetchUnlockedAchievements } from "../../../lib/gridsterGameAchievements";
import { fetchTriviaAllTimeLeaderboard, fetchTriviaDailyLeaderboard, withLeaderboardNames } from "../../../lib/gridsterGameTrivia";
import { fetchMySpinHistory } from "../../../lib/gridsterGameSpin";
import { fetchMyTriviaHistory } from "../../../lib/gridsterGameTrivia";
import { fetchProfilesByUserIds } from "../../../lib/gridsterProfiles";

function LeaderboardRow({ row, rank, detail }) {
  const initial = (row.display_name || "R").charAt(0).toUpperCase();

  return (
    <li>
      <div className="mini-profile">
        <div className="mini-pic">
          {row.avatar_url ? <img src={row.avatar_url} alt="" /> : initial}
        </div>
        <div>
          <strong>
            #{rank} {row.display_name}
          </strong>
          <span>{detail}</span>
        </div>
      </div>
    </li>
  );
}

export function LeaderboardsSection({ showToast }) {
  const [daily, setDaily] = useState([]);
  const [allTime, setAllTime] = useState([]);

  useEffect(() => {
    Promise.all([fetchTriviaDailyLeaderboard(), fetchTriviaAllTimeLeaderboard()])
      .then(async ([dailyRows, allTimeRows]) => {
        let profiles;

        try {
          profiles = await fetchProfilesByUserIds([...dailyRows, ...allTimeRows].map((row) => row.user_id));
        } catch {
          profiles = new Map();
        }

        setDaily(withLeaderboardNames(dailyRows, profiles));
        setAllTime(withLeaderboardNames(allTimeRows, profiles));
      })
      .catch((error) => showToast?.(error.message || "Could not load leaderboards."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="games-leaderboards-section">
      <h3>Leaderboards</h3>

      <div className="games-leaderboard-columns">
        <div className="glass-card">
          <h4>Today's Trivia Leaderboard</h4>
          <ol>
            {daily.map((row, index) => (
              <LeaderboardRow
                key={row.user_id}
                row={row}
                rank={index + 1}
                detail={`${row.score} pts (${row.correct_count} correct)`}
              />
            ))}
            {daily.length === 0 ? <li>No scores yet today.</li> : null}
          </ol>
        </div>

        <div className="glass-card">
          <h4>All-Time Trivia Leaderboard</h4>
          <ol>
            {allTime.map((row, index) => (
              <LeaderboardRow key={row.user_id} row={row} rank={index + 1} detail={`${row.score} pts total`} />
            ))}
            {allTime.length === 0 ? <li>No scores yet.</li> : null}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function AchievementsSection({ user, showToast }) {
  const [achievements, setAchievements] = useState([]);
  const [unlockedIds, setUnlockedIds] = useState(new Set());

  useEffect(() => {
    Promise.all([fetchAchievements(), fetchUnlockedAchievements(user?.id)])
      .then(([all, unlocked]) => {
        setAchievements(all);
        setUnlockedIds(new Set(unlocked.map((row) => row.achievement_id)));
      })
      .catch((error) => showToast?.(error.message || "Could not load achievements."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="games-achievements-section">
      <h3>Achievements</h3>

      <div className="games-achievement-grid">
        {achievements.map((achievement) => (
          <div key={achievement.id} className={`glass-card games-achievement-card ${unlockedIds.has(achievement.id) ? "unlocked" : "locked"}`}>
            <strong>{achievement.name}</strong>
            <p>{achievement.description}</p>
            {unlockedIds.has(achievement.id) ? <span className="games-achievement-status">Unlocked</span> : <span className="games-achievement-status">Locked</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function GamesLoginGate({ kicker, title, body, onAuthOpen }) {
  return (
    <article className="profile-setup-empty glass-card">
      <span>{kicker}</span>
      <h3>{title}</h3>
      <p>{body}</p>
      <button type="button" onClick={() => onAuthOpen?.("login")}>
        Log In or Sign Up
      </button>
    </article>
  );
}

export function PrizeVaultSection({ user, onAuthOpen, showToast }) {
  const [wonItems, setWonItems] = useState([]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let active = true;

    supabase
      .from("bling_purchases")
      .select("id, purchased_at, source, bling_items(name, description, preview_class, item_type)")
      .eq("user_id", user.id)
      .in("source", ["game_spin", "game_photo_battle", "game_level_reward", "game_achievement"])
      .order("purchased_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) {
          return;
        }

        if (error) {
          showToast?.(error.message || "Could not load your Prize Vault.");
          return;
        }

        setWonItems(data || []);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) {
    return (
      <GamesLoginGate
        kicker="Prize Vault"
        title="Log in to open your Prize Vault"
        body="Cosmetics and badges you win from spins, battles, levels, and achievements are saved to your account."
        onAuthOpen={onAuthOpen}
      />
    );
  }

  return (
    <div className="games-prize-vault-section">
      <h3>Prize Vault</h3>

      <div className="games-prize-vault-grid">
        {wonItems.map((row) => (
          <div key={row.id} className="glass-card games-prize-item">
            <strong>{row.bling_items?.name}</strong>
            <p>{row.bling_items?.description}</p>
            <span className="games-prize-source">{row.source.replace("game_", "").replace("_", " ")}</span>
          </div>
        ))}
        {wonItems.length === 0 ? <p>Nothing in your Prize Vault yet - play a game to win something!</p> : null}
      </div>
    </div>
  );
}

export function GameHistorySection({ user, onAuthOpen, showToast }) {
  const [spins, setSpins] = useState([]);
  const [triviaAttempts, setTriviaAttempts] = useState([]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let active = true;

    Promise.all([fetchMySpinHistory(user.id), fetchMyTriviaHistory(user.id)])
      .then(([spinHistory, triviaHistory]) => {
        if (!active) {
          return;
        }

        setSpins(spinHistory);
        setTriviaAttempts(triviaHistory);
      })
      .catch((error) => {
        if (active) {
          showToast?.(error.message || "Could not load your game history.");
        }
      });

    return () => {
      active = false;
    };
  }, [user, showToast]);

  if (!user) {
    return (
      <GamesLoginGate
        kicker="My Game History"
        title="Log in to see your game history"
        body="Spins and trivia rounds are saved on your account."
        onAuthOpen={onAuthOpen}
      />
    );
  }

  return (
    <div className="games-history-section">
      <h3>My Game History</h3>

      <div className="glass-card">
        <h4>Recent Spins</h4>
        <ul>
          {spins.map((spin) => (
            <li key={spin.id}>
              {new Date(spin.created_at).toLocaleDateString()} - {spin.reward_type === "bling_bits" ? `+${spin.bling_bits_amount} Bling Bits` : spin.reward_type}
            </li>
          ))}
          {spins.length === 0 ? <li>No spins yet.</li> : null}
        </ul>
      </div>

      <div className="glass-card">
        <h4>Recent Trivia Answers</h4>
        <ul>
          {triviaAttempts.map((attempt) => (
            <li key={attempt.id}>
              {attempt.is_correct ? "Correct" : "Incorrect"} - {attempt.score_awarded} pts ({attempt.round_context})
            </li>
          ))}
          {triviaAttempts.length === 0 ? <li>No trivia attempts yet.</li> : null}
        </ul>
      </div>
    </div>
  );
}
