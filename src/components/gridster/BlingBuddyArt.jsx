import { useEffect, useState } from "react";

const ART_FOLDER = "/images/bling-buddies";

function getArtCandidates(item) {
  if (item.imageUrl) {
    return [item.imageUrl];
  }

  // `slug` is the stable, human-readable identifier (e.g. "velvet-hex") on both
  // the static catalog and real database rows. `id` is only slug-shaped for the
  // static catalog - for anything loaded from Supabase it's a real UUID primary
  // key, which would never match a filename.
  const key = item.slug || item.id;

  if (!key) {
    return [];
  }

  return [`${ART_FOLDER}/${key}.webp`, `${ART_FOLDER}/${key}.png`];
}

function BlingBuddyArt({ item }) {
  const candidates = getArtCandidates(item);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [item.imageUrl, item.id, item.slug]);

  const src = candidates[candidateIndex];

  if (!src) {
    return <span>{item.icon}</span>;
  }

  return (
    <img
      src={src}
      alt={item.name ? `${item.name} Bling Buddy` : ""}
      onError={() => setCandidateIndex((current) => current + 1)}
    />
  );
}

export default BlingBuddyArt;
