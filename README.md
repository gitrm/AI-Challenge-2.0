# AI Challenge 2.0

## Task 1 — Company Leaderboard 2025

A pixel-faithful static replica of an internal SharePoint leaderboard page, built with vanilla
HTML/CSS/JS. All real employee data has been replaced with 227 synthetic placeholders.

**Live demo:** [https://gitrm.github.io/AI-Challenge-2.0/task-1/](https://gitrm.github.io/AI-Challenge-2.0/task-1/)

### Features

- Filter by Year, Quarter, and Category
- Live employee name search
- Podium (top 3) with gold/silver/bronze styling
- Expandable activity rows with full activity history
- 227 employees with locally cached DiceBear avatars
- Fluent UI MDL2 icon font (bundled, no CDN)

### Run locally

```bash
python -m http.server 8080 --directory task-1
# Open http://localhost:8080
```

### Regenerate synthetic data

```bash
node task-1/scripts/gen-data.js      # rebuild 227 employees in data.js
node task-1/scripts/gen-avatars.js   # re-download avatars (skips existing)
```

See [`task-1/report.md`](task-1/report.md) for the full vibe-coding workflow and design decisions.
