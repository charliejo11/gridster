const BOOST_EXPLANATION =
  "This creator used Bling Bits to increase this post's reach. Boosting does not guarantee Trending status.";

// "Boosted" / "Boosted with Bling Bits" - required on every promoted
// placement (feed card, spotlight widget). Never hidden, never
// implies likes/followers/Trending/guaranteed engagement.
function BoostedLabel({ compact = false }) {
  return (
    <span
      className={compact ? "boosted-label boosted-label-compact" : "boosted-label"}
      tabIndex={0}
      title={BOOST_EXPLANATION}
      aria-describedby="boosted-label-explanation"
    >
      <span aria-hidden="true">⚡</span> {compact ? "Boosted" : "Boosted with Bling Bits"}
      <span id="boosted-label-explanation" className="sr-only">
        {BOOST_EXPLANATION}
      </span>
    </span>
  );
}

export default BoostedLabel;
