# 🤖 AGENT.md: Billion Grid Project Context

**Role**: You are an expert Full-Stack Engineer and AI Assistant specializing in high-performance frontend rendering, React, and GitHub Actions automation. 
**Objective**: Understand this codebase completely to assist with debugging, feature additions, and refactoring while strictly adhering to the project's unique serverless architecture and performance constraints.

---

## 🌌 1. Project Overview
**Billion Grid** is a high-performance, infinitely zoomable digital land-claiming application featuring a massive **1,000,000,000 × 1,000,000,000** (10¹⁸) grid. 

**Core Philosophy**: 
- **Zero Traditional Backend**: No databases, no Node.js/Express servers, no API keys. 
- **GitHub as the Backend**: User claims are processed entirely through GitHub Issues. A GitHub Actions workflow acts as the "server," validating the claim, updating a JSON file, creating a PR, auto-merging it, and closing the issue.
- **Zero DOM for Grid**: The grid is rendered entirely using HTML5 `<canvas>`. Using DOM elements (like `div`s) for squares is strictly forbidden due to the 10¹⁸ scale.

---

## 🛠️ 2. Tech Stack
- **Frontend Framework**: React 18 (Functional Components, Hooks)
- **Build Tool**: Vite (ES Modules)
- **Rendering**: HTML5 Canvas API (2D Context) with viewport-based chunking/culling
- **Styling**: Pure CSS / CSS Modules (No Tailwind, Material UI, or heavy CSS-in-JS)
- **Utilities**: `react-colorful` (with custom color harmony math in `colorUtils.js`)
- **Automation**: GitHub Actions (`peter-evans/create-pull-request`, `actions/github-script`)
- **Hosting**: Vercel (Static Site)

---

## 📂 3. Directory Structure & Key Files

```text
billion-grid/
├── .github/
│   └── workflows/
│       └── process-claim.yml   # THE "BACKEND": Parses issues, validates JSON, creates & auto-merges PRs.
├── public/
│   └── grid-data.json          # Single source of truth. Array of claimed squares.
├── src/
│   ├── App.jsx                 # Main layout, state management, and GitHub Issue URL generation.
│   ├── CanvasGrid.jsx          # CORE RENDERING ENGINE. Handles pan, zoom, coordinate math, and viewport culling.
│   ├── ColorPicker.jsx         # Custom popover color picker using `react-colorful` and custom harmonies.
│   ├── colorUtils.js           # Pure math functions for HEX/RGB/HSL conversion and color harmony generation.
│   └── App.css                 # Global pure CSS styles.
├── vite.config.js              # Vite config (includes local dev middleware for testing).
├── vercel.json                 # Vercel deployment configuration.
└── AGENT.md                    # THIS FILE: Complete project context for AI agents.
```

### 🔑 Critical File Responsibilities:
- **`CanvasGrid.jsx`**: 
  - Manages `view` state (`offsetX`, `offsetY`, `scale`).
  - Converts screen coordinates to grid coordinates: `gridX = Math.floor((screenX - offsetX) / scale)`.
  - Uses `requestAnimationFrame` for viewport culling: only fetches and draws squares currently visible in the canvas bounds.
- **`process-claim.yml`**: 
  - Triggers on `issues: [opened, labeled]`.
  - Runs a Node.js script to parse `X`, `Y`, `Color`, and `UserId` from the issue body.
  - Validates that the coordinate is free and the `UserId` doesn't already own a square.
  - Appends to `public/grid-data.json`, creates a PR, auto-merges it, and closes the issue.

---

## ⚙️ 4. Core Workflows

### The Claim Flow (User Journey)
1. User pans/zooms the canvas and clicks an empty square to "stage" it.
2. User selects a color via the custom `ColorPicker`.
3. User enters their GitHub username and clicks "Submit".
4. Frontend generates a pre-filled GitHub Issue URL with the title `Claim: Square (X, Y)` and body containing the coordinates, color, and UserId.
5. User is redirected to GitHub to submit the issue (authenticating their identity).
6. GitHub Actions (`process-claim.yml`) triggers automatically.
7. Action validates the claim, updates `grid-data.json`, creates a PR, auto-merges it, and comments on the issue.

---

## 🚫 5. STRICT RULES & CONSTRAINTS (DO NOT VIOLATE)

1. **NO DOM ELEMENTS FOR GRID**: Never suggest or write code that renders grid squares using `<div>`, `<span>`, or any other HTML elements. All grid rendering **must** happen inside the `<canvas>` 2D context.
2. **NO TRADITIONAL BACKEND**: Do not suggest adding Express, Next.js API routes, Supabase, Firebase, or any database. The architecture is strictly static frontend + GitHub Actions.
3. **MAINTAIN "ONE SQUARE PER USER"**: Any validation logic (frontend or CI) must ensure a `userId` cannot claim more than one square.
4. **PURE CSS ONLY**: Do not introduce Tailwind CSS, Bootstrap, Material UI, or other heavy styling libraries. Use the existing pure CSS architecture.
5. **COORDINATE MATH**: When modifying canvas logic, always respect the coordinate transformation: `screen = grid * scale + offset`.
6. **JSON INTEGRITY**: The `public/grid-data.json` file must always remain a valid JSON array. The CI script handles the parsing and appending safely.

---

## 💡 6. Development & Testing Commands

```bash
# Install dependencies
npm install

# Start local development server (includes mock API middleware)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 🧠 7. AI Agent Guidelines for Code Generation

- **When modifying `CanvasGrid.jsx`**: Always ensure high-DPI (`devicePixelRatio`) scaling is preserved. Ensure `requestAnimationFrame` is used for smooth interactions and cleanup functions (`cancelAnimationFrame`) are returned in `useEffect`.
- **When modifying `process-claim.yml`**: Ensure all Node.js scripts are self-contained (using heredoc `<< 'EOF'`) and handle edge cases (e.g., missing file, invalid JSON) gracefully without crashing the workflow.
- **When adding features**: Prioritize performance. If a feature requires checking the grid state, fetch `grid-data.json` or rely on the local `claimedSquares` state array, never iterate over 10¹8 items.
- **Color Logic**: If adding new color features, extend `colorUtils.js` with pure, dependency-free math functions rather than installing new npm packages.