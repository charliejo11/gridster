import { useMemo } from "react";

const ALL_VALUE = "all";

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function FilterRow({ label, value, options, onChange }) {
  if (!options.length) {
    return null;
  }

  return (
    <div className="bling-buddy-filter-row">
      <span className="bling-buddy-filter-label">{label}</span>
      <div className="bling-buddy-filter-pills">
        <button
          type="button"
          className={value === ALL_VALUE ? "active" : ""}
          onClick={() => onChange(ALL_VALUE)}
        >
          All
        </button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={value === option ? "active" : ""}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function BlingBuddyFilters({ items, rarity, mood, vibe, onRarityChange, onMoodChange, onVibeChange }) {
  const rarityOptions = useMemo(() => uniqueSorted(items.map((item) => item.rarity)), [items]);
  const moodOptions = useMemo(() => uniqueSorted(items.map((item) => item.mood)), [items]);
  const vibeOptions = useMemo(() => uniqueSorted(items.map((item) => item.vibe)), [items]);

  return (
    <section className="bling-buddy-filters glass-card">
      <FilterRow label="Rarity" value={rarity} options={rarityOptions} onChange={onRarityChange} />
      <FilterRow label="Mood" value={mood} options={moodOptions} onChange={onMoodChange} />
      <FilterRow label="Vibe" value={vibe} options={vibeOptions} onChange={onVibeChange} />
    </section>
  );
}

export function filterBlingBuddies(items, { rarity, mood, vibe }) {
  return items.filter((item) => {
    if (rarity !== ALL_VALUE && item.rarity !== rarity) {
      return false;
    }

    if (mood !== ALL_VALUE && item.mood !== mood) {
      return false;
    }

    if (vibe !== ALL_VALUE && item.vibe !== vibe) {
      return false;
    }

    return true;
  });
}

export const BLING_BUDDY_FILTER_ALL = ALL_VALUE;

export default BlingBuddyFilters;
