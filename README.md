# Goal Tracker

A personal goal tracker for one local user. It stores goals, milestones, measurable progress, habits, reminders, and backups in a SQLite file on this computer. There is no login.

The same app runs in the browser during development and as a Windows desktop app. The desktop build keeps its database in `%APPDATA%\GoalTracker`.

## Features

- Goals with a title, description, category, priority, status, and dates. Archive and delete are separate from status.
- Milestones with completion, reordering, and a progress percentage.
- Measurable goals with dated progress entries, edit and delete, and a progress chart.
- Dashboard with active, completed, overdue, and due-this-week counts, plus category and completion charts.
- Daily and weekly habits with check-ins and streaks.
- Settings for reminder timing, database backup and restore, and JSON or CSV export.
- Reminders for goals that are due soon or overdue, and for habits that still need a check-in. The browser shows a banner. The desktop app also sends a Windows notification. Each item is reminded once per day.

## Stack

- React 19, Vite, and TypeScript
- Express 5 and Zod
- SQLite through better-sqlite3
- Tauri 2 with a Node sidecar for the Windows app

## Development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Vite runs at `http://127.0.0.1:5173` and proxies `/api` to the API on port 3000. If port 3000 is already in use, pick another port before starting:

```powershell
$env:PORT = "3456"
npm run dev
```

The database file is `data/goaltracker.db`. Set `GOALTRACKER_DATA_DIR` to store it somewhere else.

## Production web app

```bash
npm run build
npm start
```

Express serves the built interface and the API at `http://127.0.0.1:3000`.

## Desktop app

The Windows installer build needs Rust (`cargo` on `PATH`) and the WebView2 runtime.

```bash
npm run tauri:dev
npm run tauri:build
```

`npm run tauri:build` writes `src-tauri/target/release/bundle/nsis/Goal Tracker_1.0.0_x64-setup.exe`.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
```

`npm test` runs the Vitest unit and API tests. `npm run test:e2e` builds the interface and runs Playwright against a fresh data folder, including a test that stops the server and starts it again.

## Layout

```
server/     Express API, SQLite, and migrations
shared/     Types, Zod schemas, progress, and streak helpers
src/        React interface
src-tauri/  Windows desktop shell
e2e/        Playwright tests
tests/      Vitest unit and API tests
```
