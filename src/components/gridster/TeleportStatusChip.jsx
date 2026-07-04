import { useEffect, useState } from "react";
import {
  TELEPORT_STATUS_EVENT,
  TELEPORT_STATUS_LABELS,
  getTeleportStatusMap,
  reportBrokenSlurl,
} from "../../lib/gridsterTeleportStatus";

function TeleportStatusChip({ slurl, destinationName, showToast }) {
  const [entry, setEntry] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slurl) {
      return undefined;
    }

    let active = true;

    const load = () => {
      getTeleportStatusMap()
        .then((map) => {
          if (active) {
            setEntry(map.get(slurl) ?? null);
          }
        })
        .catch(() => {});
    };

    load();
    window.addEventListener(TELEPORT_STATUS_EVENT, load);

    return () => {
      active = false;
      window.removeEventListener(TELEPORT_STATUS_EVENT, load);
    };
  }, [slurl]);

  if (!slurl) {
    return null;
  }

  const status = entry?.status ?? "unverified";

  const handleReport = async (event) => {
    event.stopPropagation();
    setBusy(true);

    try {
      await reportBrokenSlurl(slurl, destinationName);
      showToast?.("Teleport reported as broken.");
    } catch (reportError) {
      showToast?.(reportError.message || "Could not report this teleport.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="teleport-status-chip">
      <span className={`teleport-status-pill status-${status}`}>{TELEPORT_STATUS_LABELS[status]}</span>
      <button
        type="button"
        className="teleport-report-flag"
        disabled={busy}
        onClick={handleReport}
        title="Report broken teleport"
      >
        ⚑
      </button>
    </span>
  );
}

export default TeleportStatusChip;
