import { useEffect, useState } from "react";
import {
  difficultyLabel,
  fetchTriviaCategories,
  formatTimeRemaining,
  startTriviaAttempt,
  submitTriviaAnswer,
} from "../../../lib/gridsterGameTrivia";

export default function TriviaSection({ user, onAuthOpen, showToast }) {
  const [categories, setCategories] = useState([]);
  const [categorySlug, setCategorySlug] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    fetchTriviaCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeQuestion?.expires_at) {
      return undefined;
    }

    const interval = setInterval(() => {
      setTimeLeft(formatTimeRemaining(activeQuestion.expires_at));
    }, 500);

    return () => clearInterval(interval);
  }, [activeQuestion]);

  const startRound = async (mode) => {
    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setBusy(true);
    setResult(null);
    setSelectedChoice(null);

    try {
      const question = await startTriviaAttempt({
        mode,
        categorySlug: categorySlug || null,
        difficulty: difficulty || null,
      });
      setActiveQuestion(question);

      if (question.already_started) {
        showToast?.("Resuming your in-progress question.");
      }
    } catch (error) {
      showToast?.(error.message || "Could not start a trivia round.");
      setActiveQuestion(null);
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    if (!activeQuestion || !selectedChoice) {
      return;
    }

    setBusy(true);

    try {
      const answerResult = await submitTriviaAnswer(activeQuestion.attempt_id, selectedChoice);
      setResult(answerResult);

      if (answerResult.already_answered) {
        showToast?.("You already answered this question.");
      } else if (answerResult.expired) {
        showToast?.("Time's up - no points awarded.");
      } else if (answerResult.is_correct) {
        showToast?.(`Correct! +${answerResult.score_awarded} points.`);
      } else {
        showToast?.("Not quite right.");
      }
    } catch (error) {
      showToast?.(error.message || "Could not submit your answer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="games-trivia-section glass-card">
      <h3>Gridster Trivia</h3>

      {!activeQuestion ? (
        <>
          <div className="games-trivia-filters">
            <select value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)}>
              <option value="">Any category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>

            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="">Any difficulty</option>
              <option value="easy">{difficultyLabel("easy")}</option>
              <option value="medium">{difficultyLabel("medium")}</option>
              <option value="hard">{difficultyLabel("hard")}</option>
            </select>
          </div>

          <div className="games-trivia-actions">
            <button type="button" disabled={busy} onClick={() => startRound("daily")}>
              Play Daily Trivia Challenge
            </button>
            <button type="button" disabled={busy} onClick={() => startRound("practice")}>
              Practice Round
            </button>
          </div>
        </>
      ) : (
        <div className="games-trivia-question">
          <p className="games-trivia-timer">{timeLeft}</p>
          <p className="games-trivia-question-text">{activeQuestion.question_text}</p>

          <div className="games-trivia-choices">
            {(activeQuestion.choices || []).map((choice) => (
              <button
                key={choice.key}
                type="button"
                disabled={busy || Boolean(result)}
                className={selectedChoice === choice.key ? "games-choice-selected" : ""}
                onClick={() => setSelectedChoice(choice.key)}
              >
                {choice.text}
              </button>
            ))}
          </div>

          {!result ? (
            <button type="button" disabled={busy || !selectedChoice} onClick={submitAnswer}>
              Submit Answer
            </button>
          ) : (
            <div className="games-trivia-result">
              <p>{result.is_correct ? "Correct!" : "Not quite."}</p>
              {result.explanation ? <p className="games-trivia-explanation">{result.explanation}</p> : null}
              <button
                type="button"
                onClick={() => {
                  setActiveQuestion(null);
                  setResult(null);
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
