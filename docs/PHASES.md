# Goal Tracker phases

All planned phases are implemented. Checks below were run on this Windows machine on 21 October 2026.

| Phase | Status | What it covers |
| --- | --- | --- |
| 0 Foundation | Complete | Vite, Express, SQLite migration runner, React shell |
| 1 Goals | Complete | Create, edit, filter, archive, and delete goals and categories |
| 2 Milestones | Complete | Checklist, reorder, progress percentage |
| 3 Progress log | Complete | Measurable goals, entries, chart |
| 4 Dashboard | Complete | Counts, due and overdue lists, charts |
| 5 Habits | Complete | Daily and weekly check-ins and streaks |
| 6 Backup | Complete | Backup, restore, JSON and CSV export |
| 7 Desktop | Complete | Tauri 2 window, Node sidecar, NSIS installer |
| 8 Reminders | Complete | Due goals and habits, once per day, banner and desktop notification |

## Verification

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 16 files, 43 tests.
- `npm run test:e2e` passed earlier on this same tree: 5 Playwright tests, including a server stop and restart that kept a goal, a checked milestone, a progress entry, and a habit check-in.
- Browser check: created "Walk every morning", added the milestone "Buy shoes", stopped the API, started it again on the same folder, and reloaded `http://127.0.0.1:3470/goals/1`. The goal and milestone were still there.
- Desktop check: installed `Goal Tracker_1.0.0_x64-setup.exe` for the current user, created "Desktop relaunch check" through the running app's API, quit, launched it again, and read the same goal back. The window title was "Goal Tracker". The database was `%APPDATA%\GoalTracker\goaltracker.db`. The test goal was then deleted.

The installer used for that check is `src-tauri/target/release/bundle/nsis/Goal Tracker_1.0.0_x64-setup.exe`. A copy is installed at `%LOCALAPPDATA%\GoalTrackerInstallTest`.

## Limitations

- The sidecar packaging script builds the Windows executable only. A macOS package is not produced here.
- The app is a single local user. There are no accounts.
- A reminder is recorded the first time it is fetched after the daily check time, so it is not shown again that day.
- `npm run dev` and `npm start` use port 3000 unless `PORT` is set. Another program may already be using that port.
