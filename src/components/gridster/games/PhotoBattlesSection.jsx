import { useEffect, useState } from "react";
import {
  castPhotoBattleVote,
  fetchMyPhotoBattleVotes,
  fetchOpenPhotoBattles,
  fetchPastPhotoBattles,
  fetchPhotoBattleEntries,
  formatBattleCountdown,
  submitPhotoBattleEntry,
  updatePhotoBattleEntry,
} from "../../../lib/gridsterGamePhotoBattles";

function BattleDetail({ battle, user, onAuthOpen, showToast, onBack }) {
  const [entries, setEntries] = useState([]);
  const [myVotes, setMyVotes] = useState([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const [entryList, voteList] = await Promise.all([
        fetchPhotoBattleEntries(battle.id),
        fetchMyPhotoBattleVotes(battle.id, user?.id),
      ]);
      setEntries(entryList);
      setMyVotes(voteList);
    } catch (error) {
      showToast?.(error.message || "Could not load this battle.");
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.id, user?.id]);

  const myEntry = entries.find((entry) => entry.user_id === user?.id);
  const isOpen = battle.status !== "closed";

  const handleSubmitEntry = async (event) => {
    event.preventDefault();

    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setBusy(true);

    try {
      if (myEntry) {
        await updatePhotoBattleEntry(myEntry.id, { photo_url: photoUrl || myEntry.photo_url, caption });
        showToast?.("Entry updated.");
      } else {
        await submitPhotoBattleEntry(battle.id, { photo_url: photoUrl, caption });
        showToast?.("Entry submitted!");
      }

      setPhotoUrl("");
      setCaption("");
      await refresh();
    } catch (error) {
      showToast?.(error.message || "Could not submit your entry.");
    } finally {
      setBusy(false);
    }
  };

  const handleVote = async (entryId) => {
    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setBusy(true);

    try {
      const result = await castPhotoBattleVote(entryId);

      if (result.vote_cast) {
        showToast?.("Vote cast!");
      } else if (result.reason === "vote_cap_reached") {
        showToast?.("You've used all your votes for this battle.");
      } else {
        showToast?.("You already voted for this entry.");
      }

      await refresh();
    } catch (error) {
      showToast?.(error.message || "Could not cast your vote.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="games-battle-detail glass-card">
      <button type="button" onClick={onBack}>
        &larr; Back to battles
      </button>

      <h3>{battle.title}</h3>
      {battle.description ? <p>{battle.description}</p> : null}
      <p className="games-battle-countdown">{formatBattleCountdown(battle.close_at)}</p>

      {isOpen ? (
        <form className="games-battle-entry-form" onSubmit={handleSubmitEntry}>
          <input
            type="text"
            placeholder="Photo URL"
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
            required={!myEntry}
          />
          <input type="text" placeholder="Caption (optional)" value={caption} onChange={(event) => setCaption(event.target.value)} />
          <button type="submit" disabled={busy}>
            {myEntry ? "Update my entry" : "Submit entry"}
          </button>
        </form>
      ) : null}

      <div className="games-battle-entries">
        {entries.map((entry) => (
          <div key={entry.id} className="games-battle-entry glass-card">
            <img src={entry.photo_url} alt={entry.caption || "Battle entry"} />
            {entry.caption ? <p>{entry.caption}</p> : null}
            <p className="games-battle-vote-count">{entry.vote_count} votes</p>
            {isOpen && entry.user_id !== user?.id ? (
              <button type="button" disabled={busy} onClick={() => handleVote(entry.id)}>
                {myVotes.includes(entry.id) ? "Voted" : "Vote"}
              </button>
            ) : null}
            {entry.user_id === user?.id ? <span className="games-battle-my-entry-badge">Your entry</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PhotoBattlesSection({ user, onAuthOpen, showToast }) {
  const [openBattles, setOpenBattles] = useState([]);
  const [pastBattles, setPastBattles] = useState([]);
  const [selectedBattle, setSelectedBattle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchOpenPhotoBattles(), fetchPastPhotoBattles()])
      .then(([open, past]) => {
        setOpenBattles(open);
        setPastBattles(past);
      })
      .catch((error) => showToast?.(error.message || "Could not load Photo Battles."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (selectedBattle) {
    return (
      <BattleDetail
        battle={selectedBattle}
        user={user}
        onAuthOpen={onAuthOpen}
        showToast={showToast}
        onBack={() => setSelectedBattle(null)}
      />
    );
  }

  return (
    <div className="games-photo-battles-section">
      <h3>Photo Challenge Battles</h3>

      {loading ? (
        <p className="games-loading">Loading...</p>
      ) : (
        <>
          <div className="games-battle-list">
            {openBattles.length === 0 ? <p>No battles are open right now - check back soon.</p> : null}
            {openBattles.map((battle) => (
              <button key={battle.id} type="button" className="games-battle-card glass-card" onClick={() => setSelectedBattle(battle)}>
                <strong>{battle.title}</strong>
                <span>{formatBattleCountdown(battle.close_at)}</span>
              </button>
            ))}
          </div>

          {pastBattles.length > 0 ? (
            <div className="games-battle-history">
              <h4>Past Battles</h4>
              {pastBattles.map((battle) => (
                <button key={battle.id} type="button" className="games-battle-card glass-card" onClick={() => setSelectedBattle(battle)}>
                  <strong>{battle.title}</strong>
                  <span>Closed</span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
