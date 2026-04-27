# Task 1 — Company Leaderboard 2025: Report

## Overview

This task asked me to recreate an internal SharePoint "Company Leader Board 2025" page as a
public-safe static web application — matching the original's visual design, layout, and
interactivity while replacing every piece of real employee data with synthetic placeholders.

---

## Vibe-Coding Workflow

The project was built using **Claude Code** (Anthropic's AI coding assistant) in a collaborative
vibe-coding session. The workflow was conversational and iterative:

1. **Screenshot-driven design** — The original page was shared as screenshots only. Claude Code
   analysed the visual layout, colour palette, spacing, and interaction patterns from those images
   and reproduced them without ever receiving any raw HTML containing real data.

2. **Sanitised HTML for structure** — A single pass of sanitised HTML (all names → `[NAME-N]`,
   avatars → `[AVATAR-N]`, org codes → `[CODE-N]`, activity titles → `[ACTIVITY-N]`) was shared
   purely to confirm dropdown option sets, ARIA roles, and collapsed-section markup. No real
   strings from that file appear in the repo.

3. **Iterative browser feedback** — A local Python `http.server` preview was used between each
   change cycle. Visual discrepancies (corner radii, chevron size, dropdown flash, scrollbar
   behaviour) were caught and fixed through back-and-forth chat, not upfront specification.

4. **Prompt technique** — Plain conversational English describing what was wrong visually, e.g.
   *"corners must be not round"*, *"chevron icon is too small"*, *"scrollbar appears on short
   lists"*. Claude Code translated these into targeted CSS/JS edits.

---

## Data Replacement Strategy

All employee data is entirely synthetic. No real names, photos, titles, org codes, or activity
titles appear anywhere in the codebase.

### Employees (`task-1/scripts/gen-data.js`)

- **Volume:** 227 employees (matching the original count).
- **Names:** Generated from a pool of 98 culturally diverse first names × 85 last names
  (8,330 combinations), shuffled deterministically with a **Mulberry32 PRNG** (seed `2025`).
  227 are drawn from the shuffle — no overlap with the real roster is possible since the pools
  are entirely invented.
- **Roles:** Generic industry titles only (`Software Engineer`, `Senior Software Engineer`,
  `QA Engineer`, `Lead QA Engineer`, `Group Manager`, `HR Manager`, `Product Designer`,
  `DevOps Engineer`, `Technical Writer`). Generic job titles are not PII.
- **Org codes:** Invented taxonomy matching the shape of the originals (dot-separated segments)
  but using letter prefixes (`ZX`, `WW`, `AB`, `MX`, `PQ`, `KR`) that do not correspond to any
  real internal division.
- **Activity scores:** The `{+8, +16, +32, +64}` point ladder visible in the screenshots is a
  UI fact, not PII — it is reused. Activity titles follow the `[EDU] ...` / `[REG] ...` prefix
  pattern observed in the UI with invented event names.
- **Activity mix profiles:** Seven weighted profiles (star speaker, active speaker, educator,
  UP champion, balanced, moderate, light) control how many Public Speaking / Education /
  University Partnership activities each employee accumulates. University Partnership is
  intentionally rare (~17 % of employees), matching the original distribution.

### Avatars (`task-1/scripts/gen-avatars.js`)

- **Source:** DiceBear `notionists` style, seeded by employee name for determinism.
- **Storage:** All 227 SVG files are pre-downloaded to `task-1/assets/avatars/` so the page
  never hits DiceBear's API at load time (avoids rate limits with 227 simultaneous requests).
- **Consistency:** Because DiceBear seeds are deterministic and the local files are committed,
  the same avatar is always shown for the same employee after every page refresh.

---

## Technical Choices

| Decision | Rationale |
|---|---|
| Vanilla HTML / CSS / JS | No build step — zero dependencies, instant GitHub Pages deploy, easier to audit for PII |
| Custom `<button>` + `<ul>` dropdowns | Native `<select>` on Windows triggers an OS-level popup that flashes black before painting; the custom implementation eliminates this completely |
| Exact pixel height set in JS before `hidden = false` | Windows reserves a scrollbar gutter even when content doesn't overflow if `overflow-y: auto` is set; pre-setting the exact height with `overflow-y: hidden` prevents it |
| Fluent UI MDL2 icon font (locally bundled) | Matches the original SharePoint page's icon set pixel-for-pixel without loading from a CDN |
| Mulberry32 PRNG (fixed seed) | Reproducible synthetic data — running `gen-data.js` again yields the identical 227 employees |
| `allDropdownClosers` registry | Guarantees mutual exclusivity (only one dropdown open at a time) with a simple O(n) close-all pattern, no event bus needed |

---

## File Structure

```
task-1/
├── index.html               # Page shell + templates
├── styles.css               # All styling (colours, layout, animations)
├── app.js                   # Filter, search, sort, expand interactivity
├── data.js                  # Synthetic employee data + activity generator
├── assets/
│   ├── avatars/             # 227 pre-downloaded DiceBear SVGs (e01–e227)
│   └── fonts/               # Locally bundled Fluent UI MDL2 woff files
└── scripts/
    ├── gen-data.js          # Generates 227 employees and patches data.js
    └── gen-avatars.js       # Downloads avatars from DiceBear and stores locally
```

---

## Reproducing the Data

```bash
# Re-generate the 227 synthetic employees (overwrites EMPLOYEE_SEEDS in data.js)
node task-1/scripts/gen-data.js

# Re-download all avatars (skips already-present files)
node task-1/scripts/gen-avatars.js
```

Both scripts are deterministic — running them again produces identical output.

---

## Running Locally

```bash
# Any static file server works; Python is zero-install on most machines
python -m http.server 8080 --directory task-1
# Open http://localhost:8080
```

---

## Deployed URL

[https://gitrm.github.io/AI-Challenge-2.0/](https://gitrm.github.io/AI-Challenge-2.0/)
