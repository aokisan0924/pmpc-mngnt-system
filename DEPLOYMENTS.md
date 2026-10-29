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

## 2026-10-29 17:20 — 3b56cc7 — DTR-fed payroll attendance and overrides
- By: Codex, requested by Kurt
- Code: `edf3717` → `3b56cc7`
- Migrations: `2026_10_29_000001_add_dtr_payroll_attendance_snapshots_to_payroll_items_table`
- Backup: `/home/u512373751/backups/pmpc_mngnt_20261029_pre_dtr_payroll.sql`
- Data changes: none; the migration adds nullable payroll-item DTR snapshot and override-reason columns. Undo by restoring the backup if needed and rolling back this migration.
- Verified: local Laravel suite passed (172 tests, 1,293 assertions), Vite build and Pint checks passed. Live migration dry run listed only the five intended nullable columns; migration completed, app returned from maintenance mode, `/login` returned HTTP 200, PayrollCreate asset returned HTTP 200, and migration status shows it as Ran.

---

## 2026-10-29 16:20 — ae23acd — Gen Mdse attendance API integration
- By: Codex, requested by Kurt
- Code: `7276f3c09cb215164c59d8aa01cd5a587fabbf56` → `ae23acde0d0fcaac867e234eb8ee8c588151efd4`
- Migrations: `2026_10_28_120000_create_attendance_integration_requests_table`
- Backup: private server directory `/home/u512373751/backups/workforce-20261029-161442`; database dump, runtime archive and source bundle passed gzip/tar/Git bundle checks and SHA-256 recording.
- Data changes: configured the private Gen Mdse integration token and employee allowlist (`15,16`) in `.env`; token value is intentionally not recorded. No DTR attendance records or punches were written. Undo by removing `WORKFORCE_GENMDSE_TOKEN` and `WORKFORCE_GENMDSE_EMPLOYEE_IDS` from `.env` and rebuilding the config cache.
- Verified: local PHP test suite passed (170 tests, 1,276 assertions), Vite production build passed, and Node DTR retry test passed. On live: migration is recorded as run; API attendance/punch routes are present; `/login` returned HTTP 200; Owner mapping requests from Gen Mdse successfully validated both allowlisted WorkForce employee records. No test punch was submitted.
## 2026-10-29 09:30 — 7276f3c — Final review step when creating a payroll
- By: Claude Code (SSH key), requested by Kurt
- Code: dfd9891 → 7276f3c
- Migrations: none
- Backup: none (no migrations or data changes)
- Data changes: none
- Verified: server checkout was clean before the pull and is at 7276f3c after; `php artisan up` done; `/login` returns 200 and the new PayrollCreate bundle is served. Backend payroll tests (57) passed locally. The new dialog itself was not clicked through in a browser (the test browser could not load the local app).

## 2026-10-23 15:07 — dfd9891 — Dated schedule history for shifts and workdays
- By: Claude Code (SSH key), requested by Kurt
- Code: c410db5 → dfd9891
- Migrations: `2026_10_23_000001_create_employee_schedules_table`, `2026_10_23_000002_move_shifts_and_work_days_to_employee_schedules`
- Backup: `~/backups/pre-schedule-history-20261023-1506.sql.gz` (full database, taken just before the deploy)
- Data changes: the four personal shifts (`employee_shift_11`, `_14`, `_15`, `_16` settings) and the `employees.work_days` values moved into 5 `employee_schedules` rows; those settings and the `work_days` column were removed. Undo: restore the backup and redeploy c410db5 (`php artisan migrate:rollback --step=2` also restores them, but drops any schedule history saved after this deploy).
- Verified: before deploying, ran the migration on a local copy of the live database and compared 3,757 values for all 17 employees (Sep 1 – Oct 23). Absences, days present, hours and DTR layouts were identical; only labels on days before Ricalde, Malana and Sibal started changed between Not started and Rest day (accepted). On live: 5 schedule rows as expected, no shift settings left, `work_days` column gone, Ricalde Oct 18 still on time with the Time In / Time Out layout, `/login` returns 200.

## 2026-10-22 13:46 — data only — Ricalde two-punch shift backdated, tap-through punches cleared
- By: Claude Code (SSH key), requested by Kurt
- Code: none
- Migrations: none
- Backup: `~/backups/ricalde-2punch-20261022.json` (setting `employee_shift_14`, `dtr_logs` 552 and 555)
- Data changes: Princess Kynna Ricalde (employee 14) two-punch shift `effective_from` 2026-10-21 → 2026-10-17, since she worked it from Oct 17 but had to tap through AM Out / PM In. Cleared those tap-through punches: Oct 17 (552) AM Out 19:45:57 and PM In 19:45:59; Oct 18 (555) AM Out 07:49:15 and PM In 07:49:16. AM In, PM Out, hours (12.38, 12.87) and status (on_time) unchanged. Undo: restore the values from the backup file and `Cache::forget('setting_employee_shift_14')`.
- Verified: database shows both days as In/Out only with the same hours and status; `Employee::hasTwoPunchShift(14)` is true for today. Dry run in a rolled-back transaction first.

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
