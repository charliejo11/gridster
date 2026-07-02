# Gridster Phase 2 Plan

## Current Status

Gridster Version 1 Prototype is live.

- Live site: https://gridster-social.netlify.app
- GitHub repo: https://github.com/charliejo11/gridster
- Status: working tree clean
- Build status: passing
- Prototype status: complete

## Phase 2 Goal

Move Gridster from a polished visual prototype toward a real app foundation.

The goal is not to add random features. The goal is to organize, stabilize, and prepare Gridster for real functionality.

## Phase 2 Priorities

### 1. Code Organization

Break large files into smaller components.

Target structure:

```txt
src/
  components/
    gridster/
      Header.jsx
      LandingPage.jsx
      LeftSidebar.jsx
      RightSidebar.jsx
      DashboardLayout.jsx
      FeedPost.jsx
      Widget.jsx
      PageHeader.jsx
      CardGrid.jsx
  data/
    gridsterMockData.js
```

## Phase 2 First Task

## Completed Phase 2 Tasks

- Created shared components:
  - Widget.jsx
  - PageHeader.jsx
  - ActionButton.jsx
  - CardGrid.jsx
  - StatusDot.jsx
- Wired shared components into the existing layout.
- Confirmed npm run build passes.
- Confirmed Netlify deploy published successfully.
- Confirmed live site still looks good.
- Created DashboardLayout.jsx to wrap the dashboard structure.
- Wired DashboardLayout into GridsterHome.jsx.
- Confirmed npm run build passes.
- Confirmed Netlify deploy published successfully.
- Confirmed the live dashboard layout still looks good.

## Future Backend/App Features

These are future real-app features to plan for after the frontend prototype is organized and stable.

- User login
- Real profiles
- Real posts
- Photo uploads
- Comments
- Friends/follows
- Groups
- Event creation
- Store pages
- SLURL saving
- Moderation/report tools
- Bling Bits system
