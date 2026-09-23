import { useEffect, useRef, useState } from "react";
import {
  LANDMARK_MATCH_ROUNDS,
  REACTION_ROUNDS,
  REGION_GUESS_ROUNDS,
  reactionDelayMs,
  scoreReactionTap,
  shuffleItems,
  sumReactionPoints,
} from "../../../lib/gridsterMiniGames";

function requireLogin(user, onAuthOpen) {
  if (user) {
    return true;
  }

  onAuthOpen?.("login");
  return false;
}

function MultipleChoiceGame({ title, lede, rounds, user, onAuthOpen }) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState([]);
  const [picked, setPicked] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);

  const round = rounds[index];
  const finished = started && index >= rounds.length;

  const start = () => {
    if (!requireLogin(user, onAuthOpen)) {
      return;
    }

    setStarted(true);
    setIndex(0);
    setPicked(null);
    setCorrectCount(0);
    setChoices(shuffleItems(rounds[0]?.choices));
  };

  const choose = (choice) => {
    if (picked || !round) {
      return;
    }

    setPicked(choice);

    if (choice === round.answer) {
      setCorrectCount((count) => count + 1);
    }
  };

  const next = () => {
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setPicked(null);

    if (rounds[nextIndex]) {
      setChoices(shuffleItems(rounds[nextIndex].choices));
    }
  };

  return (
    <div className="glass-card games-mini-game">
      <h3>{title}</h3>
      <p>{lede}</p>

      {!started || finished ? (
        <div className="creator-tools">
          {finished ? (
            <p>
              You got {correctCount} of {rounds.length}.
            </p>
          ) : null}
          <div className="tools-buttons">
            <button type="button" onClick={start}>
              {finished ? "Play again" : "Play"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p>{round.prompt}</p>
          <div className="creator-tools">
            <span className="tools-label">
              Round {index + 1} of {rounds.length}
            </span>
            <div className="tools-buttons">
              {choices.map((choice) => (
                <button key={choice} type="button" disabled={Boolean(picked)} onClick={() => choose(choice)}>
                  {choice}
                </button>
              ))}
            </div>
          </div>
          {picked ? (
            <div className="creator-tools">
              <p>{picked === round.answer ? "That's the one." : `Not quite — ${round.answer}.`}</p>
              <div className="tools-buttons">
                <button type="button" onClick={next}>
                  {index + 1 === rounds.length ? "See score" : "Next"}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function GridTapGame({ user, onAuthOpen }) {
  const [phase, setPhase] = useState("idle");
  const [roundIndex, setRoundIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const phaseRef = useRef("idle");
  const liveAtRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const setPhaseBoth = (nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  };

  const armRound = () => {
    window.clearTimeout(timerRef.current);
    setLastResult(null);
    setPhaseBoth("waiting");
    timerRef.current = window.setTimeout(() => {
      liveAtRef.current = Date.now();
      setPhaseBoth("live");
    }, reactionDelayMs());
  };

  const start = () => {
    if (!requireLogin(user, onAuthOpen)) {
      return;
    }

    setResults([]);
    setRoundIndex(0);
    armRound();
  };

  const tap = () => {
    if (phaseRef.current !== "waiting" && phaseRef.current !== "live") {
      return;
    }

    window.clearTimeout(timerRef.current);
    const result =
      phaseRef.current === "live"
        ? scoreReactionTap({ wentLive: true, tappedAt: Date.now(), liveAt: liveAtRef.current })
        : scoreReactionTap({ wentLive: false, tappedAt: Date.now(), liveAt: liveAtRef.current });

    setLastResult(result);
    setResults((current) => [...current, result]);
    setPhaseBoth("round-result");
  };

  const next = () => {
    const nextIndex = roundIndex + 1;

    if (nextIndex >= REACTION_ROUNDS) {
      setPhaseBoth("done");
      return;
    }

    setRoundIndex(nextIndex);
    armRound();
  };

  const total = sumReactionPoints(results);

  return (
    <div className="glass-card games-mini-game">
      <h3>Grid Tap</h3>
      <p>
        Wait for the sim to finish rezzing, then tap the moment it says TP NOW. Three rounds. An early tap is a false
        start.
      </p>

      {phase === "idle" || phase === "done" ? (
        <div className="creator-tools">
          {phase === "done" ? <p>Grid score: {total} points.</p> : null}
          <div className="tools-buttons">
            <button type="button" onClick={start}>
              {phase === "done" ? "Play again" : "Play"}
            </button>
          </div>
        </div>
      ) : null}

      {phase === "waiting" ? (
        <div className="creator-tools">
          <span className="tools-label">
            Round {roundIndex + 1} of {REACTION_ROUNDS}
          </span>
          <p>Hold — the sim is still rezzing.</p>
          <div className="tools-buttons">
            <button type="button" onClick={tap}>
              Tap
            </button>
          </div>
        </div>
      ) : null}

      {phase === "live" ? (
        <div className="creator-tools">
          <p>TP NOW</p>
          <div className="tools-buttons">
            <button type="button" onClick={tap}>
              Tap
            </button>
          </div>
        </div>
      ) : null}

      {phase === "round-result" && lastResult ? (
        <div className="creator-tools">
          <p>
            {lastResult.tooSoon ? lastResult.label : `${lastResult.label} — ${lastResult.ms} ms, +${lastResult.points}`}
          </p>
          <div className="tools-buttons">
            <button type="button" onClick={next}>
              {roundIndex + 1 >= REACTION_ROUNDS ? "See score" : "Next round"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function MiniGamesSection({ user, onAuthOpen }) {
  return (
    <div className="games-mini-games">
      <MultipleChoiceGame
        title="Landmark Match"
        lede="Match the hangout to the kind of Second Life place it describes."
        rounds={LANDMARK_MATCH_ROUNDS}
        user={user}
        onAuthOpen={onAuthOpen}
      />
      <GridTapGame user={user} onAuthOpen={onAuthOpen} />
      <MultipleChoiceGame
        title="Guess the Region"
        lede="Fill in the region name from a short SLURL-style clue."
        rounds={REGION_GUESS_ROUNDS}
        user={user}
        onAuthOpen={onAuthOpen}
      />
    </div>
  );
}
