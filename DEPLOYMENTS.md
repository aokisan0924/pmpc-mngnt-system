# Deployments and live-data changes

What happened on the live site, https://peoplescoopdtr.online, newest first. `CHANGELOG.md` records what changed in the code; this file records when it reached the live site and every change made directly to live data.

## 2026-11-05 16:42 — a75d152 — My tasks board: remove the Doing and Done buttons
- By: Claude Code (SSH key), requested by Kurt
- Code: `e5097be` → `a75d152`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: full suite 340 of 341 locally (the one error is the JPEG-less local PHP build in `EmployeeSignatureTest`), build passed. Fast release at the owner's request: no separate review. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200. Signed in as Kurt in Chrome (read-only, his own My tasks > Board): 0 "→ Doing" / "→ Done" buttons, 7 cards each with View and still draggable, columns To do 5, Doing 1, Done 1. Nothing was moved or saved on live during the check. Cards can still be moved by dragging; the done checkbox in the calendar day list is unchanged.

## 2026-11-05 16:34 — e5097be — My tasks page: denser calendar and a more menu in the day list (spacing pass, phase 3)
- By: Claude Code (SSH key), requested by Kurt
- Code: `c89d58e` → `e5097be`
- Migrations: none
- Backup: none (code-only deployment; layout only, no database records or schema changed)
- Data changes: none
- Verified: full suite 340 of 341 locally (the one error is the JPEG-less local PHP build in `EmployeeSignatureTest`; one unrelated employee schedule test failed once for the reviewer and passed on re-run), build passed, Opus review's Important finding (the two-line title cut-off was cancelled by `display:block`) and its minor notes were fixed. Not seen on screen before the deploy: the long-title cut-off fix. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200. Signed in as Kurt in Chrome (read-only, his own My tasks): the calendar shows 5 rows (421px tall) with today highlighted and two-line titles; the day list does not scroll inside its own box, shows View and a "..." menu, and the opened menu (Edit, Delete) sits on top; no View button under 36px; no sideways overflow. Nothing was saved or changed on live during the check.

## 2026-11-05 16:16 — c89d58e — Team tasks board: shorter cards and one compact status row (spacing pass, phase 2)
- By: Claude Code (SSH key), requested by Kurt
- Code: `4a5d1da` → `c89d58e`
- Migrations: none
- Backup: none (code-only deployment; layout only, no database records or schema changed)
- Data changes: none
- Verified: full suite 340 of 341 locally (the one error is the JPEG-less local PHP build in `EmployeeSignatureTest`), build passed, Opus review's two Important findings (Done card tint, employee move row on narrow cards) and its minor notes were fixed. Not seen on screen: the employee board at a narrow width. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200. Signed in as Kurt in Chrome (read-only): the Team tasks status area is one row 73px tall (was about 108px) showing To do 13 (4 late), Doing 7, Done 7 (25% finished, last 30 days); all 27 cards have an owner badge (initials, building for whole office, people for shared); Done cards are at full opacity with a struck-through title; the "..." menu opened on a Done card sits on top of the card below (click test passed); no sideways overflow. Nothing was saved or changed on live during the check.

## 2026-11-05 15:57 — 4a5d1da — New Task form: wider, "who" and the due choice first (spacing pass, phase 1)
- By: Claude Code (SSH key), requested by Kurt
- Code: `38978f9` → `4a5d1da`
- Migrations: none
- Backup: none (code-only deployment; layout only, no database records or schema changed)
- Data changes: none
- Verified: full suite 340 of 341 locally (the one error is the JPEG-less local PHP build in `EmployeeSignatureTest`), build passed, Opus review found nothing Critical or Important and its small items were fixed. Not re-checked in a browser: the Escape-in-search fix (one condition). On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200. Signed in as Kurt in Chrome (read-only): the New Task form is 784px wide with "who" in a left column and "When is it due?" first on the right, no inner scrolling, Add Task visible, the cursor starts on "Specific people", Escape closes it, no sideways overflow; the board shows the same 27 cards. Nothing was saved and no task created on live during the check.

## 2026-11-05 15:19 — 38978f9 — "When is it due?" choice and tasks with no due date
- By: Claude Code (SSH key), requested by Kurt
- Code: `29221c3` → `38978f9`
- Migrations: `2026_11_05_130000_make_task_due_date_nullable` (`tasks.due_date` may now be empty). Tried up, refusal with an undated task, down and up again on a scratch MariaDB 10.4; the unique index on `recurring_task_id` + `due_date` was kept. Rolling it back is refused while any task has no due date.
- Backup: `~/domains/peoplescoopdtr.online/db-backup-2026-11-05-due-type.sql` (taken 15:18; 25 tables, 58 tasks). To undo: give any undated tasks a date, `php artisan migrate:rollback --step=1 --force`, then `git checkout 29221c3`; no existing data was changed.
- Data changes: none. Existing tasks all keep their dates.
- Verified: full suite 340 of 341 locally (the one error is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint and build passed. The Opus review's one Important finding and two Minor ones were fixed, and a broken middle-dot character found during the build was repaired with a test. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200. Signed in as Kurt in Chrome (read-only): Team tasks loads with the same board (To do 13, Doing 7, Done 7, 27 cards); the New Task form shows "When is it due?" with Has a due date (default, with the date field), Recurring (no date field, "How often" starts on monthly, hint about the next date) and No due date (no date field, "Ongoing" hint). Nothing was saved and no task created on live during the check.

## 2026-11-05 09:33 — 29221c3 — Shared tasks: one task for several people
- By: Claude Code (SSH key), requested by Kurt
- Code: `436e014` → `29221c3`
- Migrations: `2026_11_05_120000_create_task_assignees_tables` (new `task_assignees` and `recurring_task_assignees` tables). Tested up, down and up again on a scratch MariaDB 10.4; rollback refuses while shared tasks exist.
- Backup: `~/domains/peoplescoopdtr.online/db-backup-2026-11-05-shared-tasks.sql` (taken 09:32; 23 tables). To undo: delete any shared tasks, `php artisan migrate:rollback --step=1 --force`, then `git checkout 436e014`; no existing data was changed.
- Data changes: none. 0 shared tasks exist; before the deploy no task had both no person and no office.
- Verified: full suite 307 of 308 locally (the one error is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint and build passed, Opus review found nothing Critical or Important and its one Minor was fixed with a test that fails without the fix. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200, task count unchanged at 54. Signed in as Kurt in Chrome (read-only): Team tasks shows the same numbers as before (To do 16, Doing 5, Done 2, 23 cards); in the New Task form, picking two people shows "How to give it" with "Each person gets their own copy" and "One shared task". Nothing was saved and no task created on live during the check.
- Log correction: the times of the five entries above (0a56b15, 335a67b, d427308, 71022ee, 0a0fb20) were first written from memory and were later than the real ones. They were corrected from the server's git reflog (UTC converted to Manila).

## 2026-11-05 08:50 — 0a0fb20 — Team tasks redesign: one filter box and clearer cards
- By: Claude Code (SSH key), requested by Kurt
- Code: `71022ee` → `0a0fb20`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: full suite 269 of 270 locally (the one error is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint and build passed. The Opus review's Important finding (the card menu hidden under the next Done card) was fixed and re-checked in the browser. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200. Signed in as Kurt in Chrome (read-only): the page shows office tabs All 21, Cubao 8, Fort Magsaysay 4, UPI Main 9, a People row without an Everyone pill, "Late only (7)" matching the "7 late" under To do, and cards with owner initials, a "List: ..." tag, "1 day late" text and a "⋯" menu (Edit, Delete) that opens on a Done card. Nothing was saved or changed on live during the check.

## 2026-11-05 08:30 — 71022ee — Assign a task to several people
- By: Claude Code (SSH key), requested by Kurt
- Code: `d427308` → `71022ee`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: full suite 268 of 269 locally (the one error is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint and build passed. The Opus review's Critical finding (editing a task failed silently) was fixed with a test that failed first and re-checked in the browser. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200. Signed in as Kurt in Chrome (read-only): New Task shows Specific people / Whole office with a searchable list grouped by Cubao, Fort Magsaysay and UPI Main and a "0 selected (up to 25)" count; Edit on a card still shows the single Employee select. No task was created or saved on live during the check.

## 2026-11-04 16:39 — d427308 — Team tasks office tabs and people row
- By: Claude Code (SSH key), requested by Kurt
- Code: `335a67b` → `d427308`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: full suite 259 of 260 locally (the one error is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint and build passed, Opus review found nothing Critical or Important. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200. Signed in as Kurt in Chrome, Team tasks shows the office tabs All 20, Cubao Office 7, Fort Magsaysay Office 5, UPI Main Office 8. Choosing Cubao narrowed the people row to its three people, set the cards to 6 to do and 1 doing, and showed 7 cards on the board. Nothing was changed on the live site during the check.

## 2026-11-04 16:22 — 335a67b — Team tasks status overview cards
- By: Claude Code (SSH key), requested by Kurt
- Code: `0a56b15` → `335a67b`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: full suite 258 of 259 locally (the one error is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint and build passed, Opus review's Important finding fixed. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200. Signed in as Kurt in Chrome, Team tasks shows To do 19, Doing 1, Done 1 (4% finished, last 30 days) with a progress bar, matching the board columns; the people pills are still there. Nothing was changed on the live site during the check.

## 2026-11-04 16:12 — 0a56b15 — Team tasks people strip
- By: Claude Code (SSH key), requested by Kurt
- Code: `973b19f` → `0a56b15`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: full suite 253 of 254 locally (the one error is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint and build passed, Opus review found nothing Critical or Important. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200. Signed in as Kurt in Chrome, Team tasks shows Everyone 20, one chip per person with open tasks and the Fort Magsaysay and UPI Main office chips; clicking Alexander filtered the board to his 5 tasks. Nothing was changed on the live site during the check.

## 2026-11-04 15:50 — 973b19f — Repeating tasks, team tasks overview and calendar
- By: Claude Code (SSH key), requested by Kurt
- Code: `d5bc350` → `973b19f`
- Migrations: `2026_11_05_000000_create_recurring_tasks_table` (new `recurring_tasks` table; `tasks.recurring_task_id` with a unique index on `recurring_task_id` + `due_date`)
- Backup: `~/domains/peoplescoopdtr.online/db-backup-2026-11-04-recurring.sql` (taken 15:48; 22 tables). To undo: `php artisan migrate:rollback --step=1 --force`, then `git checkout d5bc350`, no data was changed.
- Data changes: none. No repeat rules exist yet, so no copies were generated.
- Verified: full suite 244 of 245 locally (the one error is the JPEG-less local PHP build in `EmployeeSignatureTest`), build passed, migrate and rollback tested on a scratch MariaDB 10.4. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200, task count unchanged at 51 and 0 rules, no log errors, `tasks:generate-recurring` scheduled daily 06:00. Signed in as Kurt in Chrome, Team tasks shows "0 overdue, 20 due this week, 20 open" and the Board and Calendar tabs. Nothing was changed on the live site during the check.

## 2026-11-04 15:28 — hosting setting only — Hostinger cron for the WorkForce scheduler
- By: Claude Code (Chrome, Kurt's hPanel session), requested by Kurt
- Code: none
- Migrations: none
- Backup: none (no database or code change)
- Data changes: none to the app. In hPanel > peoplescoopdtr.online > Advanced > Cron Jobs a second job was added: every minute (`* * * * *`), `/opt/alt/php83/usr/bin/php /home/u512373751/domains/peoplescoopdtr.online/pmpc_mngnt/artisan schedule:run`. The existing PIS job (`/usr/bin/php .../peoplesmpcoop.com/public_html/pis_core/artisan schedule:run`) was not touched. Reason: no cron was running for this app, so the 18:00 attendance fill and monthly archive were not running on schedule. To undo: delete that one job in hPanel > Cron Jobs.
- Verified: within about a minute a new cron log `~/.logs/cronjob_p9GTj47ONC` appeared with "No scheduled commands are ready to run." (the scheduler runs for this app and nothing was due). Not yet verified: the 18:00 attendance job actually running; check tonight.

## 2026-11-04 15:10 — d5bc350 — Admin text tidy: employee record, settings, dashboard
- By: Claude Code (SSH key), requested by Kurt
- Code: `cadeb9a` → `d5bc350`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: Pint, full suite (221 of 222; the one failure is the JPEG-less local PHP build in `EmployeeSignatureTest`), Node tests and build passed locally. On live: server tree clean before and after, no pending migrations, app returned from maintenance mode, task count unchanged at 51, no log errors. Checked read-only while signed in as Kurt in Chrome: the Operations dashboard shows "Your attendance", plain punch times and "Ready to compute payroll" with no period line; an employee record shows the one-line signature note; Settings > DTR Signatories shows "Signatory 1" with no badge and a "Preview" label. Nothing was changed on the live site during the check.

## 2026-11-04 13:18 — cadeb9a — My tasks page title matches the sidebar
- By: Claude Code (SSH key), requested by Kurt
- Code: `b3007a0` → `cadeb9a`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: build and Node tests passed locally; the two browser-test checks that expected "Work Planner" were updated. On live: server tree clean before and after, no pending migrations, app returned from maintenance mode, task count unchanged at 51, `/login` 200, `/employee/planner` redirects guests, the new `Planner` asset returns 200 and matches the manifest, the live Planner bundle no longer contains "Work Planner", no log errors. Not checked: a signed-in look at the live page after this change.

## 2026-11-04 13:10 — b3007a0 — Notify employees when an admin assigns them a task
- By: Claude Code (SSH key), requested by Kurt
- Code: `a2513c2` → `b3007a0`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none at deploy time. From now on, creating a task for an employee, a whole-office task, or reassigning a task adds `notifications` rows (type `task_assigned`) for the people concerned; undo for any of them is deleting that row. The `notifications` table held 458 rows at deploy.
- Verified: local suite 221 of 222 passed (the one failure is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint clean, Node tests passed, build passed; six new tests cover the notification rules; browser-checked locally that an admin assigning a task puts "New task assigned" with a Task badge on the employee's Notifications page. On live: server tree clean before and after, no pending migrations, app returned from maintenance mode, task count unchanged at 51, `/login` 200, Notifications and Team tasks redirect guests, the new `Notifications` asset returns 200, matches the manifest and handles `task_assigned`, the new `notifyAssignees` method is present in the live controller, no log errors. Not tested on live: an actual assignment, to avoid sending a real notification to staff; the real-time popup channel was not tested.

## 2026-11-04 12:49 — a2513c2 — Task tidy-ups: board filter, old completed tasks, tests
- By: Claude Code (SSH key), requested by Kurt
- Code: `c6b682b` → `a2513c2`
- Migrations: none (three already-run migrations only gained `declare(strict_types=1)`)
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: local suite 215 of 216 passed (the one failure is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint clean, Node tests passed, build passed; browser-checked locally that the Done filter no longer empties the Planner board and is hidden there, and that the Team tasks "Show completed over 30 days old" option sets `?older=1`. On live: server tree clean before and after, no pending migrations, app returned from maintenance mode, task count unchanged at 51, `/login` 200, Team tasks and planner redirect guests, new `TeamTasks` and `Planner` assets return 200 and match the manifest, the live Team tasks bundle contains the new option, the new 30-day query runs on the live MySQL database, no log errors. Not checked: a signed-in click-through on the live site.

## 2026-11-04 12:39 — c6b682b — Text cleanup: payroll input, saved payroll batch, employee attendance
- By: Claude Code (SSH key), requested by Kurt
- Code: `29608ee` → `c6b682b`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: local suite 211 of 212 passed (the one failure is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint clean, Node tests passed, build passed; browser-checked locally that the three pages render (payroll input without the duplicate totals block, saved batch, an employee's attendance). On live: server tree clean before and after, no pending migrations, app returned from maintenance mode, task count unchanged at 51, `/login` 200, payroll and attendance pages redirect guests, the new `PayrollCreate`, `PayrollShow` and `DtrShow` assets return 200 and match the manifest, the live saved-batch bundle has "Export to Excel" and no longer has the old sentence, the live attendance bundle no longer has "days in period", no log errors. Not checked: a signed-in click-through, or a payroll export or print view (code paths untouched).

## 2026-11-04 12:34 — 29608ee — Admin screens: compact header, text cleanup, darker placeholders
- By: Claude Code (SSH key), requested by Kurt
- Code: `98e73dd` → `29608ee`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: local suite 211 of 212 passed (the one failure is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint clean, Node tests passed, build passed; browser-checked locally on the admin dashboard, Employees, Payroll (desktop and phone), Team tasks and page text of the other admin screens; login placeholder contrast measured at 5.9:1 after the change. On live: server tree clean before and after, no pending migrations, app returned from maintenance mode, task count unchanged at 51, `/login` 200, admin pages redirect guests, new `Payroll`, `Employees` and `ThirteenthMonth` assets return 200 and match the manifest, the live Payroll bundle has the new text and the live CSS has the narrow-width class, no log errors. Not checked: a signed-in click-through on the live site, or a payroll export or print view (code paths untouched).

## 2026-11-04 12:03 — 98e73dd — Employee screens: compact header, text cleanup, punch-first dashboard
- By: Claude Code (SSH key), requested by Kurt
- Code: `bd4348e` → `98e73dd`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: local suite 211 of 212 passed (the one failure is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint clean, Node tests passed, build passed; browser-checked locally at desktop and phone width on the dashboard (punch first, persistent punch bar above the bottom nav on phones, a real PM In punch recorded and the screen advanced to PM Out), attendance, payslips, profile and notifications. On live: server tree clean before and after, no pending migrations, app returned from maintenance mode, task count unchanged at 51, `/login` 200, employee pages redirect guests, new `Dashboard` and `Payslips` assets return 200 and match the manifest, the live Dashboard bundle contains "Next required action" and no longer contains "Refreshes automatically", no log errors. Not checked: a signed-in click-through or a real punch on the live site.

## 2026-11-04 11:45 — bd4348e — Drag-only moves on Team tasks
- By: Claude Code (SSH key), requested by Kurt
- Code: `6898cba` → `bd4348e`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: build passed; browser-checked locally that Team tasks cards show only View, Edit and Delete, the drag hint appears, dragging a card to Done moves it, and the View window still offers the move buttons. On live: server tree clean before and after, no pending migrations, app returned from maintenance mode, task count unchanged at 51, `/login` 200, Team tasks and planner redirect guests, the new `TeamTasks` asset returns 200, matches the manifest and contains the drag hint, no log errors. Not checked: a signed-in click-through on the live site.

## 2026-11-04 11:38 — 6898cba — Visible View button on task cards
- By: Claude Code (SSH key), requested by Kurt
- Code: `6d7ec1c` → `6898cba`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: Pint and task tests passed locally (31 task tests, 4 frontend policy tests); browser-checked locally that the Planner agenda shows View, Edit and Delete, the board card shows View, and View opens the detail window. On live: server tree clean before and after, no pending migrations, app returned from maintenance mode, task count unchanged at 51, `/login` 200, Team tasks and planner redirect guests, new `Planner` and `TeamTasks` assets return 200 and match the manifest, the live Planner bundle contains the View button, no log errors. Not checked: a signed-in click-through on the live site.

## 2026-11-04 11:34 — 6d7ec1c — Task detail modal
- By: Claude Code (SSH key), requested by Kurt
- Code: `da6d33b` → `6d7ec1c`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: local suite 211 of 212 passed (the one failure is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint clean, browser-checked locally on admin Team tasks (open, Edit, Delete confirm, close) and on the employee board (open, move, Escape, no Edit/Delete on whole-office tasks). On live: server tree clean before and after, no pending migrations, app returned from maintenance mode, task count unchanged at 51, `/login` 200, Team tasks and planner redirect guests, new `TeamTasks` and `Planner` assets return 200 and match the manifest, the `TaskDetailModal` chunk is on the server, no log errors. Not checked: a signed-in click-through on the live site.

## 2026-11-04 11:30 — da6d33b — Office tasks and import of the Google Tasks lists
- By: Claude Code (SSH key), requested by Kurt
- Code: `8b93955` → `da6d33b`
- Migrations: `2026_11_04_130000_add_office_to_tasks_table` (makes `tasks.employee_id` nullable and adds nullable `tasks.office`; the employee foreign key is kept)
- Backup: `/home/u512373751/backups/pre-office-tasks-20261104-1125.sql.gz` (full database dump taken just before the deploy; gzip test passed)
- Data changes: 21 tasks created by `php artisan tasks:import-office-lists --apply`, all assigned by Kurt (`EMP-0002`), category = the original list name. Xander list 5 tasks (Alexander A. Feria Jr.), Reynold list 4 (Reynold Valdez), Team Cubao 2 (Katherine Sevilleno, Kurt), Team Isabela 5 (3 whole-office tasks for UPI Main Office, "Yvon and Jerome" once each for Yvonne N. Condo and Jerome A. Santos), Team Fortmag 5 (3 whole-office tasks for Fort Magsaysay, "Validating information on PIS" once each for Diana Pasco and Mariel S. Lucero). Tasks with no due date were set to 2026-11-04. The 30 existing personal tasks were not touched. To undo: `DELETE FROM tasks WHERE assigned_by IS NOT NULL AND category IN ('Xander','Reynold','Team Isabela','Team Fortmag','Team Cubao');` (no other admin-assigned tasks existed before this import), or restore the backup.
- Verified: local suite 210 of 211 passed (the one failure is the JPEG-less local PHP build in `EmployeeSignatureTest`), Pint clean, migration run on a scratch MariaDB with rollback guard checked, browser-checked locally that an office member sees and can move an office task but not edit it. On live: server tree clean before and after, dry run listed only the two `ALTER`s, migration ran, import dry run showed exactly the 21 planned tasks, apply created 21, task rows went from 30 to 51 (30 personal, 21 assigned), a second dry run planned 0 new, `/login` 200, Team tasks and planner redirect guests, new assets return 200 and match the manifest, no log errors, maintenance mode off. Not checked: a signed-in click-through on the live site.

## 2026-11-04 11:10 — data only — Make Alexander A. Feria Jr. an admin
- By: Claude Code (SSH key), requested by Kurt
- Code: none
- Migrations: none
- Backup: `/home/u512373751/backups/pre-feria-jr-admin-20261104-1110.sql.gz` (full database dump taken just before the change; gzip test passed)
- Data changes: `employees` id 4 (employee ID `2022-00003`, Alexander A. Feria Jr., Operations, active) changed from `employee` to `super_admin`. One row, guarded by id, employee ID and current role. This gives him the Admin Portal and the DTR edit-request and absence notifications sent to admins; payroll is unaffected. To undo: `UPDATE employees SET role='employee' WHERE id=4;`
- Verified: before and after rows read back on live (role `employee` → `super_admin`, status still active); role counts went from 14 employee / 3 super_admin to 13 / 4. The president, Alexander L. Feria (id 3), was not touched.

## 2026-11-04 11:08 — 8b93955 — Private personal tasks and smooth Team tasks
- By: Claude Code (SSH key), requested by Kurt
- Code: `de91eaa` → `8b93955`
- Migrations: `2026_11_04_120000_add_assigned_by_to_tasks_table` (adds nullable `tasks.assigned_by`, a foreign key to `employees` that sets null on delete)
- Backup: `/home/u512373751/backups/pre-private-tasks-20261104-1107.sql.gz` (full database dump taken just before the deploy; gzip test passed)
- Data changes: none to existing rows. All 30 existing tasks have `assigned_by` empty, so they count as employees' personal tasks and no longer appear on Team tasks; only tasks an admin creates from now on are listed there. To undo: `php artisan migrate:rollback --step=1 --force`, or restore the backup.
- Verified: local suite passed except the unrelated JPEG-less local PHP build failure in `EmployeeSignatureTest`; Pint clean; 5 Node tests passed; browser-checked locally that personal tasks are hidden, an admin-created task appears, cards move instantly and the loader stays off under a 1.5 s network delay. On live: server tree clean before and after, dry run listed only the column and foreign key, migration ran, `assigned_by` column present (30 tasks, 30 personal, 0 assigned), `/login` 200, Team tasks and planner redirect guests, new `TeamTasks` and `app` assets return 200 and match the manifest, no new log errors, maintenance mode off. Not checked: a signed-in click-through on the live site.

## 2026-11-04 10:57 — de91eaa — Task board and Team tasks
- By: Claude Code (SSH key), requested by Kurt
- Code: `9d63f5a` → `de91eaa`
- Migrations: `2026_11_04_000000_allow_doing_task_status` (changes `tasks.status` from enum pending/done to varchar(20), default `pending`)
- Backup: `/home/u512373751/backups/pre-task-board-20261104-1056.sql.gz` (full database dump taken just before the deploy; gzip test passed)
- Data changes: none. All 33 existing tasks kept their status (30 done, 3 pending). To undo: `php artisan migrate:rollback --step=1 --force` (turns any `doing` task back into `pending`), or restore the backup.
- Verified: local suite 189 of 190 passed (the one failure is a JPEG-less local PHP build in `EmployeeSignatureTest`, unrelated); Pint clean; migration run on a scratch MariaDB with up, data kept, `doing` accepted and rollback all checked; browser-checked the employee Board and admin Team tasks screens on a local copy. On live: server tree clean before and after, dry run listed only the one `ALTER`, migration ran, `tasks` rows 33 before and after, `/login` returned 200, `/admin/team-tasks` and `/employee/planner` redirect guests, the new `TeamTasks` and `Planner` assets return 200 and match the manifest, no new errors in the Laravel log. Not checked: a signed-in click-through on the live site (no live credentials used). The app was in maintenance mode for under a minute; the new code was briefly live before the migration ran, when only the Doing status could have failed.

## 2026-10-30 10:02 — 9d63f5a — Keep payroll batch exports Excel-only
- By: Codex, requested by Kurt
- Code: `9887079` → `9d63f5a`
- Migrations: none
- Backup: none (code-only deployment; no payroll data changed)
- Data changes: none. The payroll batch page now offers only the Management Excel workbook; separate payslip PDF downloads remain available elsewhere.
- Verified: Clean server checkout at `9d63f5a`; no migrations; caches rebuilt and app returned live. The saved batch page shows only the Excel workbook export, with the PDF option absent. Both cutoff signatory selectors default to Kurt Vincent Fariñas, Katherine Sevilleno, and Alexander L. Feria. A fresh live export opened in WPS Office; the management workbook layout, employee/pay figures, and printed signatory names were visible.

## 2026-10-30 09:56 — 9887079 — Default payroll export signatories
- By: Codex, requested by Kurt
- Code: `06536a3` → `9887079`
- Migrations: none
- Backup: none (code-only deployment; no database records changed)
- Data changes: none. Both cutoff blocks default to Kurt Fariñas (prepared), Katherine Sevilleno (certified correct), and President Alexander L. Feria (approved). Users can still change or clear the selections.
- Verified: Clean server checkout at `9887079`; no migrations; caches rebuilt and app returned live. Read-only production lookup resolved the defaults to active employee IDs 12, 13, and 3, respectively, for both cutoffs.

## 2026-10-30 09:49 — 06536a3 — Remove mandatory DTR reason for payroll
- By: Codex, requested by Kurt
- Code: `d74e25b` → `06536a3`
- Migrations: none
- Backup: none (code-only deployment; no database records changed)
- Data changes: none. Payroll review and finalization no longer require an attendance override reason; unresolved DTR dates remain listed for reference.
- Verified: Server checkout is clean at `06536a3`; migration check reported nothing to migrate; optimized caches rebuilt and app returned live.

## 2026-10-30 09:46 — d74e25b — Default General Merchandise payroll to 15 days
- By: Codex, requested by Kurt
- Code: `8e594fb` → `d74e25b`
- Migrations: none
- Backup: none (code-only deployment; no database records changed)
- Data changes: none. General Merchandise employees now default to the 15-day cutoff basis, including those with custom schedules.
- Verified: Production checkout is clean at `d74e25b`; migration check reported nothing to migrate; optimized caches rebuilt; app returned live. Live October 16–31 payroll preview shows Violie R. Malana and John Roy C. Sibal at 15 paid days each. No payroll was saved.

## 2026-10-30 09:33 — 8e594fb — Route General Merchandise staff to payroll sheet
- By: Codex, requested by Kurt
- Code: `aa907d4` → `8e594fb`
- Migrations: none
- Backup: none (code-only deployment; no database records changed)
- Data changes: none. Employees whose department is General Merchandise are grouped on that sheet in the management export, while their verified payroll office and saved payroll figures stay unchanged.
- Verified: server checkout is clean at `8e594fb`; no migrations ran; optimization caches rebuilt and app returned live. Exported October payroll draft #3 from the live page: four employees appear under Main Office, and Violie R. Malana and John Roy C. Sibal appear under General Merchandise.

## 2026-10-30 09:17 — b6ae5bf — Allow 16-day custom-schedule DTR snapshots
- By: Codex, requested by Kurt
- Code: 327c98a → b6ae5bf
- Migrations: none
- Backup: none (code-only; no schema or live-data changes)
- Data changes: none
- Verified: The clean server checkout fast-forwarded to b6ae5bf; `php artisan migrate --force` reported nothing to migrate; optimized caches rebuilt; the site returned from maintenance mode; live `/login` returned HTTP 200. Payroll paid-days remain capped at 15 while the DTR basis snapshot accepts 16.

## 2026-10-30 08:56 — data only — Verify Main Office assignments for payroll
- By: Codex, requested by Kurt
- Code: none
- Migrations: none
- Backup: none
- Data changes: Changed Violie R. Malana (EMP-0005) and John Roy C. Sibal (EMP-0006) from no verified payroll office to Main Office, based on Kurt's confirmation that both belong to UPI Main Office. To undo, restore each employee's prior unassigned state by clearing the payroll office and its verification timestamp through an authorized data correction.
- Verified: Both employee profiles display “Main Office · HR verified.” The app confirmed the office update; existing saved payroll assignments remain unchanged. The October 16–31 draft was not saved because the payroll form rejects paid-days values above 15.

## 2026-10-30 00:49 — 327c98a — Maintenance page crash fix
- By: Claude, requested by Kurt
- Code: `4f7c26c` → `327c98a`
- Migrations: none
- Backup: none
- Data changes: none
- Verified: server checkout was clean before and after; while in maintenance mode `/login` returned HTTP 503 (the page renders, no server error); after `artisan up` it returned HTTP 200. Found because the earlier deploys logged a 500 from this page when a visitor arrived during maintenance.

## 2026-10-30 00:49 — 4f7c26c — Auto-fill punches for always-present employees
- By: Claude, requested by Kurt
- Code: `d7a0635` → `4f7c26c`
- Migrations: none
- Backup: none (the earlier backup `db-backup-2026-10-30-pre-feria.sql` predates this deploy; no data was changed)
- Data changes: none. The new command was run once on live and created 0 rows (today's 5pm punch time had not passed); Alexander L. Feria still has 78 rows, latest 2026-10-29. Undo for future rows: delete his `dtr_logs` rows dated after 2026-10-29, and flip off "Always present" to stop new ones.
- Verified: server checkout was clean before and after; caches rebuilt, maintenance mode cleared; `schedule:list` shows `dtr:fill-always-present` daily at 18:00; live `/login` returned HTTP 200 and `/admin/dtr` redirected a logged-out visitor (302). The DTR pages themselves were not opened on the live site. The 6pm schedule only runs if an hPanel cron job calls `schedule:run`; without it, rows are still filled when an admin opens or prints a DTR.

## 2026-10-30 00:44 — data only — President's DTR filled with standard punches
- By: Claude, requested by Kurt
- Code: none
- Migrations: none
- Backup: `~/domains/peoplescoopdtr.online/db-backup-2026-10-30-pre-feria.sql` (full database dump taken just before the change)
- Data changes: one-off script created 78 `dtr_logs` rows for Alexander L. Feria (2003-00001, id 3) on every workday (Mon–Fri, no holidays on file) from 2026-07-14 (account creation) to 2026-10-29, each with AM in 08:00, AM out 12:00, PM in 13:00, PM out 17:00, status on_time, 8.00 hours. The dry run showed 0 existing rows, so nothing was overwritten. Undo: delete `dtr_logs` where `employee_id = 3` (he had no rows before), or restore from the backup. Today's date (2026-10-30) and later were left alone.
- Verified: after the run he has 78 rows, all `on_time`, 8.00 hours each; the server checkout is still clean at `d7a0635`; the temporary script was removed from the server.

## 2026-10-30 00:25 — d7a0635 — Pre-hire payroll days and Export all DTRs
- By: Claude, requested by Kurt
- Code: `e667c38` → `d7a0635`
- Migrations: none
- Backup: none
- Data changes: none
- Verified: server checkout was clean before deployment and is now at `d7a0635`; migrate reported nothing to migrate; Laravel caches rebuilt and maintenance mode cleared; live `/login` returned HTTP 200 and `/admin/dtr/export-all` redirected a logged-out visitor (HTTP 302). The export and a new-hire payroll preview were not exercised on the live site.

## 2026-10-29 18:14 — e667c38 — Portal typography and spacing polish
- By: Codex, requested by Kurt
- Code: `10afda2` → `e667c38`
- Migrations: none
- Backup: none
- Data changes: none
- Verified: server checkout was clean before deployment and is now at `e667c38`; Laravel caches rebuilt and maintenance mode cleared; live `/login` returned HTTP 200 with the expected page title and the current CSS asset returned HTTP 200.

## 2026-10-29 17:57 — 6c6e15a — Whole-site redundancy cleanup
- By: Codex, requested by Kurt
- Code: `b2af756` → `6c6e15a`
- Migrations: none
- Backup: none
- Data changes: none
- Verified: server checkout was clean before deployment and is now at `6c6e15a`; Laravel caches rebuilt and maintenance mode cleared; live `/login` returned HTTP 200 with the expected page title and the new CSS asset returned HTTP 200.

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
