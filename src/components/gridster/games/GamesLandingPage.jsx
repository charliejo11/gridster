import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { fetchGameLevels, fetchGameProfile, fetchGameTitles, xpProgress } from "../../../lib/gridsterGameProfiles";
import { fetchMySpinsToday } from "../../../lib/gridsterGameSpin";
import DailySpinSection from "./DailySpinSection";
import TriviaSection from "./TriviaSection";
import PhotoBattlesSection from "./PhotoBattlesSection";
import { AchievementsSection, GameHistorySection, LeaderboardsSection, PrizeVaultSection } from "./GamesProgressSections";

const SECTIONS = [
  { id: "play", label: "Play Now" },
  { id: "daily", label: "Daily Games" },
  { id: "battles", label: "Photo Battles" },
  { id: "leaderboards", label: "Leaderboards" },
  { id: "achievements", label: "Achievements" },
  { id: "vault", label: "Prize Vault" },
  { id: "history", label: "My Game History" },
];

function GameProfileSummary({ user }) {
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    const load = user
      ? Promise.all([fetchGameProfile(user.id), fetchGameLevels(), fetchGameTitles()])
      : Promise.resolve(null);

    load.then((result) => {
      if (!result) {
        setProfile(null);
        setProgress(null);
        return;
      }

      const [gameProfile, levels] = result;
      setProfile(gameProfile);
      setProgress(xpProgress(gameProfile.xp, levels));
    });
  }, [user]);

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="games-profile-summary glass-card">
      <span className="games-profile-level">Level {profile.level}</span>
      {profile.current_title ? <span className="games-profile-title">{profile.current_title}</span> : null}
      {progress ? (
        <div className="games-xp-bar">
          <div className="games-xp-bar-fill" style={{ width: `${Math.round(progress.progressRatio * 100)}%` }} />
        </div>
      ) : null}
      <span className="games-profile-xp">{profile.xp} XP</span>
    </div>
  );
}

function DailyGamesStatus({ user, isPremium }) {
  const [freeSpun, setFreeSpun] = useState(false);
  const [bonusSpun, setBonusSpun] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    fetchMySpinsToday(user.id).then((spins) => {
      setFreeSpun(spins.some((spin) => spin.spin_number === 1));
      setBonusSpun(spins.some((spin) => spin.spin_number === 2));
    });
  }, [user]);

  return (
    <div className="games-daily-status glass-card">
      <h3>Today's Dailies</h3>
      <ul>
        <li>{freeSpun ? "✓" : "○"} Daily Spin</li>
        {isPremium ? <li>{bonusSpun ? "✓" : "○"} Bonus Spin (Gridster Plus)</li> : null}
        <li>Play today's Trivia Challenge from the Play Now tab</li>
      </ul>
    </div>
  );
}

export default function GamesLandingPage({ onAuthOpen, showToast }) {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("play");
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data?.user ?? null);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    const load = user
      ? supabase
          .from("profiles")
          .select("is_plus")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) => Boolean(data?.is_plus))
      : Promise.resolve(false);

    load.then((value) => {
      if (active) {
        setIsPremium(value);
      }
    });

    return () => {
      active = false;
    };
  }, [user]);

  return (
    <section className="games-landing-page">
      <GameProfileSummary user={user} />

      <nav className="games-section-tabs">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? "active" : ""}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div className="games-section-content">
        {activeSection === "play" ? (
          <>
            <DailySpinSection user={user} isPremium={isPremium} onAuthOpen={onAuthOpen} showToast={showToast} />
            <TriviaSection user={user} onAuthOpen={onAuthOpen} showToast={showToast} />
            <button type="button" className="games-jump-to-battles" onClick={() => setActiveSection("battles")}>
              View Photo Challenge Battles &rarr;
            </button>
          </>
        ) : null}

        {activeSection === "daily" ? (
          <>
            <DailyGamesStatus user={user} isPremium={isPremium} />
            <DailySpinSection user={user} isPremium={isPremium} onAuthOpen={onAuthOpen} showToast={showToast} />
          </>
        ) : null}

        {activeSection === "battles" ? <PhotoBattlesSection user={user} onAuthOpen={onAuthOpen} showToast={showToast} /> : null}
        {activeSection === "leaderboards" ? <LeaderboardsSection showToast={showToast} /> : null}
        {activeSection === "achievements" ? <AchievementsSection user={user} showToast={showToast} /> : null}
        {activeSection === "vault" ? <PrizeVaultSection user={user} showToast={showToast} /> : null}
        {activeSection === "history" ? <GameHistorySection user={user} showToast={showToast} /> : null}
      </div>
    </section>
  );
}
