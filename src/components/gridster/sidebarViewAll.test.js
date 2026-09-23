import { describe, expect, it } from "vitest";
import { sidebarViewAllPage } from "./sidebarViewAll.js";

describe("right sidebar View All", () => {
  it("opens an existing page for each sidebar section that has one", () => {
    expect(sidebarViewAllPage("Trending Events")).toBe("Events");
    expect(sidebarViewAllPage("Popular Groups")).toBe("Groups");
    expect(sidebarViewAllPage("Suggested Creators")).toBe("CreatorPagesDirectory");
    expect(sidebarViewAllPage("Friends")).toBe("Messages");
    expect(sidebarViewAllPage("Live Now")).toBe("TonightInSL");
    expect(sidebarViewAllPage("Friend Alerts")).toBe("Notifications");
    expect(sidebarViewAllPage("SLURL Teleport")).toBe("TeleportDiscovery");
  });

  it("does not invent a page when a section has no destination", () => {
    expect(sidebarViewAllPage("Boosted on Gridster")).toBeNull();
    expect(sidebarViewAllPage("Featured Sims / Stores")).toBeNull();
  });
});
