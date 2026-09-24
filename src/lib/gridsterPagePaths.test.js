import { describe, expect, it } from "vitest";
import {
  GRIDSTER_PAGE_PATHS,
  authModeForGridsterPath,
  nextGridsterHistoryPath,
  pageForGridsterPath,
  pathForGridsterPage,
} from "./gridsterPagePaths.js";

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
    expect(pathForGridsterPage("Auth")).toBeNull();
  });

  it("opens /login and /signup on Auth in the matching mode", () => {
    expect(pageForGridsterPath("/login")).toBe("Auth");
    expect(pageForGridsterPath("/signup")).toBe("Auth");
    expect(authModeForGridsterPath("/login")).toBe("login");
    expect(authModeForGridsterPath("/signup")).toBe("signup");
    expect(authModeForGridsterPath("/games")).toBeNull();
  });

  it("keeps an auth deep link while Auth is open and clears it after leaving", () => {
    expect(nextGridsterHistoryPath({ activePage: "Auth", showLanding: false, pathname: "/login", authMode: "login" })).toBe("/login");
    expect(nextGridsterHistoryPath({ activePage: "Auth", showLanding: false, pathname: "/signup", authMode: "signup" })).toBe("/signup");
    expect(nextGridsterHistoryPath({ activePage: "Auth", showLanding: false, pathname: "/signup", authMode: "login" })).toBe("/login");
    expect(nextGridsterHistoryPath({ activePage: "Auth", showLanding: false, pathname: "/login", authMode: "signup" })).toBe("/signup");
    expect(nextGridsterHistoryPath({ activePage: "Auth", showLanding: false, pathname: "/", authMode: "login" })).toBeNull();
    expect(nextGridsterHistoryPath({ activePage: "Home", showLanding: false, pathname: "/signup", authMode: "login" })).toBe("/");
    expect(nextGridsterHistoryPath({ activePage: "Games", showLanding: false, pathname: "/login", authMode: "login" })).toBe("/games");
  });

  it("keeps the existing history rules for other pages", () => {
    expect(nextGridsterHistoryPath({ activePage: "Games", showLanding: false, pathname: "/" })).toBe("/games");
    expect(nextGridsterHistoryPath({ activePage: "Home", showLanding: false, pathname: "/games" })).toBe("/");
    expect(nextGridsterHistoryPath({ activePage: "Home", showLanding: false, pathname: "/" })).toBeNull();
    expect(nextGridsterHistoryPath({ activePage: "Home", showLanding: true, pathname: "/privacy" })).toBe("/");
    expect(nextGridsterHistoryPath({ activePage: "Home", showLanding: true, pathname: "/" })).toBeNull();
  });
});
