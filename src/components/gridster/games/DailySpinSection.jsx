import { useEffect, useState } from "react";
import { fetchMySpinsToday, spinDaily } from "../../../lib/gridsterGameSpin";

function rewardLabel(spin) {
  if (!spin) {
    return "";
  }

  if (spin.reward_type === "bling_bits") {
    return `+${spin.bling_bits_amount} Bling Bits`;
  }

  if (spin.reward_type === "cosmetic" || spin.reward_type === "badge") {
    return "A new cosmetic item";
  }

  return "No prize this time";
}

export default function DailySpinSection({ user, isPremium, onAuthOpen, showToast }) {
  const [spinsToday, setSpinsToday] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  const refresh = async () => {
    if (!user) {
      setSpinsToday([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const spins = await fetchMySpinsToday(user.id);
      setSpinsToday(spins);
    } catch (error) {
      showToast?.(error.message || "Could not load today's spins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const freeSpin = spinsToday.find((spin) => spin.spin_number === 1);
  const bonusSpin = spinsToday.find((spin) => spin.spin_number === 2);

  const handleSpin = async (isBonusSpin) => {
    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setSpinning(true);

    try {
      const result = await spinDaily(isBonusSpin);

      if (result.already_spun) {
        showToast?.(`You already spun today - you got ${rewardLabel(result)}.`);
      } else {
        showToast?.(`Daily Spin result: ${rewardLabel(result)}!`);
      }

      await refresh();
    } catch (error) {
      showToast?.(error.message || "Could not spin right now.");
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="games-spin-section glass-card">
      <h3>Daily Spin</h3>
      <p>One free spin every day. Gridster Plus members get a bonus second spin.</p>

      {loading ? (
        <p className="games-loading">Loading...</p>
      ) : (
        <div className="games-spin-actions">
          <button type="button" disabled={spinning || Boolean(freeSpin)} onClick={() => handleSpin(false)}>
            {freeSpin ? `Spun: ${rewardLabel(freeSpin)}` : "Spin (Free)"}
          </button>

          {isPremium ? (
            <button type="button" disabled={spinning || Boolean(bonusSpin)} onClick={() => handleSpin(true)}>
              {bonusSpin ? `Bonus spun: ${rewardLabel(bonusSpin)}` : "Bonus Spin (Gridster Plus)"}
            </button>
          ) : (
            <p className="games-spin-upsell">Upgrade to Gridster Plus for a bonus spin every day.</p>
          )}
        </div>
      )}
    </div>
  );
}
