# Deployments and live-data changes

What happened on the live site, https://peoplescoopdtr.online, newest first. `CHANGELOG.md` records what changed in the code; this file records when it reached the live site and every change made directly to live data.

- Times are Asia/Manila.
- The server checkout is `~/domains/peoplescoopdtr.online/pmpc_mngnt` and runs the `main` commit shown in the latest entry.
- Commits that only change documentation (such as this file) don't need a deploy.
- Routine in-app work by HR (approving DTR edit requests, corrections through the DTR page, password resets) is not logged here unless it is part of a fix or a deploy.

Entry template:

```markdown
## YYYY-MM-DD HH:MM — <commit or "data only"> — <short title>
- By: <who ran it>, requested by <who>
- Code: <old commit> → <new commit>, or none
- Migrations: <names>, or none
- Backup: <file or folder on the server>, or none
- Data changes: <what changed, for whom, and how to undo it>, or none
- Verified: <what was checked on the live site>
```

---

## 2026-10-22 09:13 — c410db5 — Employee monthly log oldest → newest
- By: Claude Code (SSH key), requested by Kurt
- Code: e9b631b → c410db5
- Migrations: none
- Backup: none (no schema or data change)
- Data changes: none
- Verified: `/employee/dtr` lists Oct 1 at the top through Oct 31 at the bottom.

## 2026-10-22 09:09 — data only — Lucero Oct 21 set to an afternoon half day
- By: Claude Code through the HR correction form, requested by Kurt
- Data changes: Mariel S. Lucero, Oct 21, changed from 12:31 / 12:31 / 12:31 / 17:00 (late) to PM In 13:00, PM Out 17:00 (half day, 4.00 h). The correction is saved as an approved edit request with the reason "Afternoon half day: 1:00 PM to 5:00 PM", which holds the original times.
- Verified: Admin DTR shows a half day with 4.00 h.

## 2026-10-22 ~09:05 — data only — Status recompute, 18 logs
- By: Claude Code (`php artisan dtr:recompute-status --apply`), requested by Kurt
- Data changes: only the `status` column changed. Punches and hours were not touched. Ran over Sep 1–27 and Oct 11–21.
  - 16 September Friday logs went from undertime to on_time. They had been saved under the old 17:00 Friday end, and the pages already displayed them as on time. The employees were Santos (Sep 4, 11, 18, 25), Feria Jr. (Sep 11, 25), Condo (Sep 11, 18, 25), Lucero (Sep 18, 25), Sevilleno (Sep 18, 25), Pasco (Sep 18, 25) and Valdez (Sep 25).
  - Pasco, Oct 16: undertime → half_day.
  - Lucero, Oct 21: late → half_day. That log was later corrected by hand (entry above).
- Deliberately skipped: Condo Sep 28 (AM Out 00:00) and Oct 10 (08:05 → 22:00) have wrong saved times and are waiting for an HR correction.
- Undo: set each listed log's status back to the old value shown in the dry-run table in this entry.
- Verified: a dry run afterwards listed only the two skipped Condo logs.

## 2026-10-22 09:03 — e9b631b — Forgotten PM In tapped after shift end still counts as a full day
- By: Claude Code (user's SSH session), requested by Kurt
- Code: 654c970 → e9b631b
- Migrations: none
- Data changes: none (a dry run of `dtr:recompute-status` was only listed)

## 2026-10-22 09:00 — 654c970 — Edit requests in order, tap-through punches, missing time out
- By: Claude Code (user's SSH session), requested by Kurt
- Code: db12b95 → 654c970
- Migrations: none
- Data changes: none (a dry run only). The first connection attempt dropped before running anything.

## 2026-10-22 08:46 — db12b95 — Afternoon-only half days start at PM In
- By: Claude Code (user's SSH session), requested by Kurt
- Code: 1b59ba9 → db12b95
- Migrations: none
- Data changes: none
- Verified: the admin dashboard offered AM Out as step 2 of 4 for a morning log.

## 2026-10-22 08:38 — 1b59ba9 — Edit requests hide lunch rows only for two-punch staff
- By: Claude Code (user's SSH session), requested by Kurt
- Code: 27d1533 → 1b59ba9
- Migrations: none
- Data changes: none
- Verified: Lucero's Oct 22 request shows all four punches.

## 2026-10-22 08:30 — 27d1533 — Admin personal pages and edit details on DTR logs
- By: Claude Code (user's SSH session), requested by Kurt
- Code: a33e70b + uncommitted hand-copied files → 27d1533
- Migrations: none to run. The two 2026-10-16 migrations had already run when the code was copied in by hand.
- Backup:
  - `~/domains/peoplescoopdtr.online/db-backup-2026-10-22.sql` (taken 08:28).
  - The hand-copied working tree is saved in the server git stash `server-copy-before-2026-10-22-deploy`. It matched `main` at 4447a14 except for older copies of `CHANGELOG.md` and `DESIGN.md`.
- Data changes: none
- Verified: super admin can open `/employee/dtr` and `/employee/planner`, and all admin pages load.

## 2026-10-21 10:49–11:21 — 4447a14, copied by hand — Two-punch shifts for 12-hour employees
- By: not recorded. The code was copied onto the server instead of pulled with git, so the server checkout stayed at a33e70b until 2026-10-22.
- Code: 21 files from 4447a14 plus the built assets, from `output/two-punch-release.tar.gz`
- Migrations: none
- Backup: `~/domains/peoplescoopdtr.online/.backup-two-punch-202610210249/`
  - `before.tar.gz`: the replaced code files.
  - `shift-switch-before.json`, `malana-oct16-20-before.json` and `sibal-oct16-19-before.json`: the prior settings and logs.
- Data changes:
  - Shifts were set in the Compensation tab: Ricalde two-punch 08:00–20:00 from Oct 21, Malana 06:00–18:00 from Oct 16, Sibal 18:00–06:00 (overnight) from Oct 16. Malana's and Sibal's shifts first started Oct 21 and Oct 20, then were moved back to Oct 16.
  - Malana's Oct 16–20 and Sibal's Oct 16–20 logs were reshaped from four-punch entries (Sibal's overnight shifts split across midnight) into two-punch time in / time out. The originals are in the JSON files above.
  - The reason for reshaping those logs was not written down.

## 2026-10-17 to 2026-10-22 — data only — HR approvals in the app
For reference while backfilling. These are DTR edit requests approved by Kurt in the app:
- Oct 19: Sevilleno (Oct 16), Sibal (Oct 16, Oct 17).
- Oct 20: Sibal (Oct 17), Malana (Oct 16).
- Oct 22: Malana (Oct 21), Kurt (Oct 20, Oct 21), Lucero (Oct 22).

Employee records were also updated on Oct 19–20 (Condo, Santos, Valdez) and on Oct 22 (Ricalde, likely a password reset). No pending requests were left on Oct 22.
