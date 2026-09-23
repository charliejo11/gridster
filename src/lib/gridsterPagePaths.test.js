import { describe, expect, it } from "vitest";
import { GRIDSTER_PAGE_PATHS, pageForGridsterPath, pathForGridsterPage } from "./gridsterPagePaths.js";

describe("gridster page paths", () => {
  it("maps Games to /games and back again", () => {
    expect(GRIDSTER_PAGE_PATHS.Games).toBe("/games");
    expect(pathForGridsterPage("Games")).toBe("/games");
    expect(pageForGridsterPath("/games")).toBe("Games");
  });

  it("keeps the legal pages on their public paths", () => {
    expect(pageForGridsterPath("/privacy")).toBe("PrivacyPolicy");
    expect(pageForGridsterPath("/terms")).toBe("TermsOfService");
    expect(pageForGridsterPath("/community-guidelines")).toBe("CommunityGuidelines");
  });

  it("leaves unknown paths unmapped so the feed stays put", () => {
    expect(pageForGridsterPath("/")).toBeNull();
    expect(pageForGridsterPath("/not-a-page")).toBeNull();
    expect(pathForGridsterPage("Home")).toBeNull();
  });
});
