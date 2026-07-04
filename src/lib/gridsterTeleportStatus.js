import { supabase } from "./supabaseClient";

export const GRIDSTER_TELEPORT_REPORTS_TABLE = "gridster_teleport_reports";
export const TELEPORT_STATUS_EVENT = "gridster:teleport-status-changed";

export const TELEPORT_STATUS_LABELS = {
  unverified: "Unverified",
  working: "Verified Working",
  broken: "Reported Broken",
  needs_update: "Needs Update",
};

let cachedStatusMap = null;
let inFlightFetch = null;

export function notifyTeleportStatusChanged() {
  cachedStatusMap = null;
  inFlightFetch = null;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TELEPORT_STATUS_EVENT));
  }
}

export async function getTeleportStatusMap() {
  if (cachedStatusMap) {
    return cachedStatusMap;
  }

  if (!inFlightFetch) {
    inFlightFetch = supabase
      .from(GRIDSTER_TELEPORT_REPORTS_TABLE)
      .select("slurl, status, report_count")
      .then(({ data, error }) => {
        if (error) {
          inFlightFetch = null;
          throw error;
        }

        cachedStatusMap = new Map((data || []).map((row) => [row.slurl, row]));
        return cachedStatusMap;
      });
  }

  return inFlightFetch;
}

export async function reportBrokenSlurl(slurl, destinationName) {
  const { data, error } = await supabase.rpc("report_broken_slurl", {
    target_slurl: slurl,
    target_destination_name: destinationName || null,
  });

  if (error) {
    throw error;
  }

  notifyTeleportStatusChanged();
  return data;
}
