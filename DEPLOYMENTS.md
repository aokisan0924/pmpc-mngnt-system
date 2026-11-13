# Deployments and live-data changes

What happened on the live site, https://peoplescoopdtr.online, newest first. `CHANGELOG.md` records what changed in the code; this file records when it reached the live site and every change made directly to live data.

## 2026-11-13 11:53 — f3435a7 — Excel column widths restored
- By: Claude Code (SSH key), requested by Kurt
- Code: `6952131` → `f3435a7` (includes docs-only commits): the management Excel template had lost every column width when today's ELECTRICITY and ADJUSTMENT columns were inserted (names squeezed, amounts shown as ####). The template was rebuilt from the morning version with the column inserts fixed. Names are now 30 wide and every amount column at least 15; layout, print areas, logos and sign-offs are unchanged. A test now checks the widths.
- Migrations: none
- Backup: none (no schema or data change)
- Data changes: none.
- Verified: locally 474 of 479 PHP tests (5 GD-only) passed. On live: HEAD `f3435a7`; the deploy ran in its own SSH call with umask 0022; 0 tracked files at 600; login, `app-CC6o4fW2.js` and `app-BwxU5lyi.css` return 200. The finalized November 1st cutoff payroll (id 19) exported fine with the name column at width 30; the file was deleted afterwards and the payroll is unchanged (finalized, last updated 11:38).

## 2026-11-13 — no code change — Fix white site (file permissions from the 11:36 deploy)
- By: Claude Code (SSH key), reported by Kurt
- Code: none (HEAD stays `6952131`)
- Migrations: none
- Backup: none (permissions only)
- Data changes: none. The 11:36 deploy ran the backup and `git pull` in one SSH session after `umask 077`, so the 76 files the pull wrote (including `public/build/assets/*.js` and `*.css`) were created owner-only (600) and the `scripts` folder 700. PHP still worked (same user), but the web server returned 403 for the JS and CSS, so pages loaded white. Fixed with `chmod 644` on exactly those tracked files and `chmod 755 scripts`. Undo: not needed. Lesson: never set `umask` in the same session as `git pull`.
- Verified: 0 tracked files left at 600; `git status` clean; login 200; `app-CC6o4fW2.js` and `app-BwxU5lyi.css` 200. The November 1st cutoff payroll (id 19), saved and finalized by Kurt at 11:38 with 12 employees and net ₱73,503.23, is intact.

## 2026-11-13 11:36 — 6952131 — Step 3: type overtime, holiday work pay, gross and net, with adjustments
- By: Claude Code (SSH key), requested by Kurt
- Code: `2e2f9d4` → `6952131` (includes docs-only commits): on payroll step 3, weekday and rest-day overtime pay, holiday work pay, gross pay and net pay can be typed in pesos. A typed gross or net becomes a visible Adjustment (earnings or deductions, with an optional reason). It has new ADJUSTMENT columns in the management Excel (before GROSS PAY, after ELECTRICITY); the deductions adjustment goes to the voucher's Other Income line; both show on the payslip. Sign-off labels were kept next to their names. General Merchandise rows note that their Excel gross is after Absent. Reviewed by a fresh reviewer; its important finding and the label drift were fixed.
- Migrations: `2026_11_13_000004_add_adjustments_to_payroll_items` (adds `earnings_adjustment`, `deductions_adjustment`, `adjustment_note`)
- Backup: `~/backups/pmpc-20261113-1136-before-adjustments.sql` (1.1 MB, complete) on the server
- Data changes: none (0 payroll batches before and after). The trial export ran in a rolled-back transaction and left no file.
- Verified: locally 473 of 478 PHP tests (5 GD-only) and 49 JS tests passed; Pint and build clean. On live: HEAD `6952131`, login 200, migration ran, and a rolled-back trial export of the November 1st cutoff, with a typed gross ₱10,000 and net ₱9,000 on one employee, built and balanced, with 4 ELECTRICITY and 6 ADJUSTMENT headers on each office sheet. Not checked in a browser: the step 3 screen.

## 2026-11-13 10:14 — 2e2f9d4 — Step 3: electricity, type over any number, DOLE holiday work pay
- By: Claude Code (SSH key), requested by Kurt
- Code: `fcabecb` → `2e2f9d4` (includes docs-only commits): payroll step 3 gets a typed Electricity deduction (own ELECTRICITY column after every RENTAL column in the management Excel, added into the voucher's Rent Income, shown on the payslip); every step 3 number can be typed over (blue with ↺ undo, saved with that payroll only; absences capped at basic pay); SSS/PhilHealth/Pag-IBIG typed on the 2nd cutoff are deducted; DOLE holiday work pay is added automatically (special/announced 130%, rest day 150%; regular 200%, rest day 260%; hours after 8 × 130%; hourly = daily ÷ shift hours; only what basic pay doesn't cover), from the DTR or hours typed per holiday. Reviewed by a fresh reviewer; its 4 important findings were fixed with tests.
- Migrations: `2026_11_13_000003_add_step3_edit_fields_to_payroll_items` (adds `electricity_deduction`, `worked_holiday_pay`, `overrides`, `holiday_hours` to `payroll_items`)
- Backup: `~/backups/pmpc-20261113-1014-before-step3.sql` (1.1 MB, complete) on the server
- Data changes: none. Before deploying, live had 0 payroll batches, so no saved draft changes on re-save. The trial export ran inside a rolled-back transaction, and its temp file was deleted.
- Verified: locally 464 of 469 PHP tests (5 GD-only) and 46 JS tests passed; Pint and build clean. On live: HEAD `2e2f9d4`, login 200, the four new columns exist, and a rolled-back trial export of the November 1st cutoff built and balanced (the export rejects any unbalanced row or journal), with 4 ELECTRICITY headers on each office sheet; 0 payrolls afterwards. Not checked in a browser: the step 3 screen itself (the in-app browser pane was hidden).

## 2026-11-13 09:16 — fcabecb — Payroll day button
- By: Claude Code (SSH key), requested by Kurt
- Code: `d027cb4` → `fcabecb` (includes docs-only `dca3069`, `c59bb15`): a "Payroll day: fill in today's DTR" button on payroll step 2 (admin and Katherine, cutoff's last weekday only). Pressing it fills the remaining punches for everyone timed in today (office 12:00 / 1:00 / 5:00, 4:00 on Fridays; store staff their own clock-out; overnight shifts and active absence notices skipped; existing punches never changed), and any time-in later that day is filled at once. Reviewed by a fresh reviewer; its overnight-shift finding was fixed with a test.
- Migrations: none (uses the `settings` row `payroll_day`)
- Backup: none (no schema or data change)
- Data changes: none on live; the button has not been pressed.
- Verified: locally 442 of 447 PHP tests (5 GD-only), Pint and build clean; the button was pressed on a local test database and filled a test DTR day to 8:04 / 12:00 / 1:00 / 4:00 (status late). On live: HEAD `fcabecb`, login 200, the November 1st cutoff is recognised as payroll day today, payroll day not yet on, route `/admin/payroll/payday` present. Earlier entries' times corrected from the server's git reflog (08:26, 09:00).

## 2026-11-13 09:00 — d027cb4 — Excel sign-offs: two preparers, President last
- By: Claude Code (SSH key), requested by Kurt
- Code: `9bcc193` → `d027cb4`: management Excel sign-offs now read Prepared by Reynold D. Valdez and Kurt Vincent F. Fariñas side by side, Certified Correct by Katherine Sevilleno, Approved by the President last; "Noted by" removed. The voucher shows both preparers (C31, D31) and Katherine (H31). The export form and step 3 preview show "Prepared by (2nd)".
- Migrations: none
- Backup: none (no schema or data change)
- Data changes: none on live.
- Verified: locally 428 of 433 PHP tests (5 GD-only) passed, including the updated sign-off test; build and Pint clean; the template keeps its logos. On live: HEAD `d027cb4`, login 200, default signatories resolve to Reynold D. Valdez, Kurt Vincent Fernando Fariñas, Katherine Sevilleno and Alexander L. Feria; 0 payroll batches.

## 2026-11-13 08:26 — 026e02e — Payroll day: anyone timed in today is present all day
- By: Claude Code (SSH key), requested by Kurt
- Code: `2771567` → `026e02e` (includes docs-only `d44fa18`): the payroll now counts today; anyone with a time-in today counts as a full shift (only a late morning arrival is charged as tardiness), and no time-in today means absent. On the cutoff's last day the wizard no longer says the cutoff isn't over.
- Migrations: none
- Backup: none (no schema or data change)
- Data changes: none on live.
- Verified: locally 428 of 433 PHP tests (5 GD-only) passed, with a new test that fails without the rule; Pint clean. On live: HEAD `026e02e`, login 200; a read-only check at 08:28 showed 9 of 11 people scheduled today at a full shift (Alexander A. Feria Jr. 5 min late), with Reynold D. Valdez and John Roy C. Sibal at 0 because they had not timed in yet.

## 2026-11-12 20:30 — 2771567 — Payroll review fixes (full verification)
- By: Claude Code (SSH key), requested by Kurt
- Code: `1df74bf` → `2771567` (includes docs-only `8d157fc`): a full "late" day whose first punch is after lunch is charged its late minutes; Monday–Friday staff hired after a cutoff starts are paid only the weekdays from the hire date; the NWNP amount is capped at the whole absence; days present is rounded once; SSS/PhilHealth/Pag-IBIG are forced to 0 on the 2nd cutoff. Found by a fresh independent review of all payroll changes since `70a960b`; each fix has a test that failed before it.
- Migrations: none
- Backup: none (no schema or data change; no payroll batches on live)
- Data changes: none on live.
- Verified: locally 427 of 432 PHP tests (5 GD-only) and all JS tests passed, build and Pint clean. On live before and after the fix: a rolled-back mockup export of Nov 2–13 checked by script — every row gross − deductions = net, grid columns add up, deduction tables match, office totals match, all four journals balance, voucher ₱109,638.91 = ₱109,638.91 and equals the four sheets, no leftover markers, 0 payrolls / 0 items afterwards; the screen math matched the server on 48 employee-cutoffs (Oct 1st, Oct 2nd, Nov 1st, Nov 1st mockup) with 0 differences. Every live start date is before Oct 31, so November pay is unchanged by the hire-date fix. HEAD `2771567`, login 200.
- Open items for HR: Nov 30 and December holidays not entered; DTR gaps for Mariel S. Lucero (Nov 3–4), Diana B. Pasco (Nov 6), John Roy C. Sibal (Nov 11 not clocked out); late grace period is 0 minutes; 7 staff have no hire date (Violie and Sibal count from Oct 16, their account date).

## 2026-11-12 19:45 — 1df74bf — Undertime never deducted; only lates
- By: Claude Code (SSH key), requested by Kurt
- Code: `0d111db` → `1df74bf` (includes docs-only `bf458a3`): any complete DTR day (on time, late or undertime, office or store shift) pays the full shift; leaving early is never deducted; lates are deducted only as tardiness (daily rate ÷ 8 ÷ 60 × minutes). Half days and absences still count missing time.
- Migrations: none
- Backup: none (no schema or data change)
- Data changes: none on live.
- Verified: locally 423 of 428 PHP tests (5 GD-only) passed, including updated undertime tests and a new half-day test. On live: app back up, maintenance off, login 200, HEAD `1df74bf`; a read-only mockup preview of Nov 2–13 now shows only the Nov 2 NWNP day as absent for office staff, Mariel S. Lucero ₱1,200 and Diana B. Pasco ₱600 for days with no DTR, John Roy C. Sibal ₱600 for the unresolved Nov 11 (his Nov 3 short punch now counts as a full day), and lates only for Kurt (2 min, ₱3.33) and Alexander A. Feria Jr. (112 min, ₱205.29).

## 2026-11-12 19:20 — 0d111db — Plain message for typed hours without a note
- By: Claude Code (SSH key), requested by Kurt
- Code: `d39e783` → `0d111db` (includes docs-only `d0a25e4`): a "Type hours" DTR day missing its hours or note now says so in plain words with the employee and date, and step 2's Next stays disabled until both are filled (was the technical "items.7.day_resolutions.2026-11-11.note field is required…").
- Migrations: none
- Backup: none (no schema or data change)
- Data changes: none on live.
- Verified: locally 18 wizard tests passed (new test for both messages), build passed. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `0d111db`.

## 2026-11-12 19:05 — d39e783 — October defaults: allowances, signatories, voucher; overtime panel
- By: Claude Code (SSH key), requested by Kurt
- Code: `599f0fa` → `d39e783` (includes docs-only `7af3c63` and `c27d8db`): allowances on a new payroll pre-fill from each employee's monthly allowances ÷ 2; default signatories Prepared Reynold D. Valdez, Certified Katherine Sevilleno, Approved Alexander L. Feria, plus a new "Noted by" (Kurt Vincent F. Fariñas) on every sign-off block and on the voucher; sign-off names use the middle initial; voucher payee "Alexander Feria et. al." and voucher number counted from October 2026 = 0017 (November = 0018); an "Overtime & holiday pay" panel at the top of payroll step 3 with "Add a holiday" for admins. Template rebuilt with `scripts/build-payroll-template.py` (Noted by spots placed only in empty cells).
- Migrations: none
- Backup: `~/db-backups/pmpc-before-october-export-20261112-0749.sql` covers the data change below.
- Data changes (from HR's October 2026 payroll file, dry run first, 3 rows): Reynold Valdez (id 11, EMP-0001) middle name → "D.", position "Admin Clerk" → "Admin"; Diana Pasco (id 2, 2026-00028) middle name → "B.", position "Loan Processor" → "Loan Processor/Cashier"; Alexander A. Feria Jr. (id 4, 2022-00003) position "Operations" → "Operation Officer". Allowances needed no change: every record already equals the October amounts × 2. To undo: restore those three fields from the values above.
- Verified: locally 421 of 426 PHP tests (5 GD-only) passed, build passed; on the local live-data copy step 3 shows the new panel. On live: server tree clean before and after, nothing to migrate, app back up, login 200; default signatories resolve to Reynold D. Valdez / Katherine Sevilleno / Alexander L. Feria / Kurt; a rolled-back mockup export of the Nov 1st cutoff has voucher 0018, the payee and Kurt as Noted by; allowances pre-fill as Feria ₱5,000/₱2,000/₱1,500, Yvonne ₱500/₱250, Mariel ₱500; 0 payroll batches on live.

## 2026-11-12 18:30 — 599f0fa — Lates as tardiness (October formula); LATE column
- By: Claude Code (SSH key), requested by Kurt
- Code: `102769a` → `599f0fa` (includes docs-only `bb0d023`): late minutes (from shift start after the grace period; overnight shifts handled) are deducted as tardiness = daily rate ÷ 8 ÷ 60 × minutes, and no longer also come off as missing hours; leaving early still does. Step 3 shows a LATE column (amount and minutes); the Excel TARDINESS columns and the GOVT tables' minutes are filled from it.
- Migrations: none
- Backup: none (no schema or data change)
- Data changes: none on live.
- Verified: locally 420 of 425 PHP tests (5 GD-only) and 6 payroll JS tests passed, build passed; on the local live-data copy step 3 shows the LATE column. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `599f0fa`; grace is 0 minutes; a read-only check of October 16–30 gives the same tardiness as HR's October file for Violie R. Malana (10 min, ₱12.50), Kurt Vincent Fariñas (4 min, ₱6.67) and Alexander A. Feria Jr. (40 min, ₱73.32); John Roy C. Sibal shows 55 min (₱68.75) against 15 min (₱18.75) in the file.

## 2026-11-12 18:05 — 102769a — Payroll mockup mode; "Edit day" buttons
- By: Claude Code (SSH key), requested by Kurt
- Code: `78aebb5` → `102769a` (includes docs-only `2c446dc`): Payroll runs has "Make a mockup" — the wizard opens in mockup mode (no save buttons; real DTR for past days, every remaining day up to the end date counted as present, holidays still no work, no pay for office staff; works even for a finalized cutoff, which a rolled-back transaction sets aside); the DTR page's correction column is "Edit" with "Edit day" / "Add day" and the Attendance records button reads "Edit a day"; a holiday on the last day of a payroll window is found even when dates carry a time part (the live MySQL column is a plain DATE, so live was not affected).
- Migrations: none
- Backup: none (no schema or data change)
- Data changes: none on live.
- Verified: locally 418 of 423 PHP tests (5 GD-only) and 34 JS tests passed, build passed; new tests cover assumed days, a finalized batch left untouched by a mockup export, and a real save ignoring the mock flag; on the local live-data copy "Make a mockup" opened "Payroll mockup" with the banner for Nov 2–13. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `102769a`; a read-only mockup preview of the Nov 1st cutoff marks Nov 12–13 as assumed present for Kurt; 0 payroll batches on live.
- Noted, not changed: Bonifacio Day (Nov 30) is not in the live holiday list.

## 2026-11-12 17:40 — 78aebb5 — Correct a day from Attendance records; full shift for on-time days
- By: Claude Code (SSH key), requested by Kurt
- Code: `9931963` → `78aebb5` (includes docs-only `ff82243`, `fee0586`, `68c18d6`): Attendance records shows "Correct a day" on each employee row for DTR correctors (same correction form as the DTR page, now a shared component, with a date picker that pre-fills that day's punches); in payroll a complete on-time office day (4-punch schedule) counts as the full shift, while late, undertime and half days still count actual hours.
- Migrations: none
- Backup: none (no schema or data change; no payroll batches exist on live)
- Data changes: none on live. Locally only, the correction form was opened for John Roy C. Sibal on Nov 3 on the `pmpc_live_preview` copy and cancelled.
- Verified: locally 414 of 420 PHP tests before the last fix, then the DTR, wizard and payroll suites (30 tests) passed, including new tests for the list's per-day punches (correctors only) and the full-shift rule; build passed; on the local copy the list's form showed "Correct Tue, Nov 3" with Sibal's 5:47 pm / 5:58 pm punches. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `78aebb5`; the read-only Nov 1st-cutoff preview now shows only the Nov 2 NWNP day as absent for Yvonne, Jerome, Reynold, Kurt, Katherine and Alexander L. Feria.

## 2026-11-12 17:15 — data only — Rent for Jerome A. Santos
- By: Claude Code (SSH key), requested by Kurt
- Code: none
- Migrations: none
- Backup: `~/db-backups/pmpc-before-october-export-20261112-0749.sql` (his rent is 0.00 in it)
- Data changes: `employees.rental_deduction` 0.00 → 1500.00 (₱750 per cutoff) for Jerome A. Santos (id 7, 2026-00026), matching the ₱750 RENTAL deducted in both cutoffs of the October 2026 Main Office sheet. Dry run in the same command: exactly one employee, at 0.00, was updated. To undo: set it back to 0.00 for id 7.
- Verified: 1 row updated; the read-only Nov 1st-cutoff preview shows rental ₱750 for him. A full comparison of every employee's deductions against the October 2026 file found no other difference except a 5-centavo rounding in Alexander L. Feria's 2nd-cutoff loan in that file (left as is).

## 2026-11-12 17:00 — data only — SSS, PhilHealth and Pag-IBIG for Violie and Sibal
- By: Claude Code (SSH key), requested by Kurt
- Code: none
- Migrations: none
- Backup: `~/db-backups/pmpc-before-october-export-20261112-0749.sql` (both employees have 0.00 for all three in it)
- Data changes: `employees.sss_deduction` 0.00 → 500.00, `philhealth_deduction` 0.00 → 250.00, `pagibig_deduction` 0.00 → 200.00 for Violie Malana (id 15, EMP-0005) and John Roy Sibal (id 16, EMP-0006), matching the amounts HR deducted from both on the October 2026 1st cutoff. Withholding tax stays 0.00. Dry run first showed exactly these two employees at 0.00. To undo: set the three fields back to 0.00 for ids 15 and 16.
- Verified: 2 rows updated; the read-only Nov 1st-cutoff preview shows SSS ₱500, PhilHealth ₱250, Pag-IBIG ₱200 for both.

## 2026-11-12 16:55 — 9931963 — General Merchandise paid 30/31 days; profile basic pay
- By: Claude Code (SSH key), requested by Kurt
- Code: `abaebea` → `9931963` (includes docs-only `d46aa93`): General Merchandise gets daily rate × the calendar days of each half month (1st–15th = 15; 16th–month end = 15 or 16) less missing hours; weekend relievers (custom schedules) stay on days worked; the employee profile's Compensation tab shows the matching monthly basic and rule text, and labels allowances as monthly.
- Migrations: none
- Backup: none (no schema or data change; no payroll batches exist on live)
- Data changes: none on live. Locally only, Kurt's account on the `pmpc_live_preview` copy was used to view three profiles.
- Verified: locally 413 of 418 PHP tests (5 GD-only), including a new test for 15 / 15 / 16 days (Nov 1st, Nov 2nd, Oct 2nd); build passed; on the local live-data copy the profiles show Kurt ₱17,600 (rate × 22), Violie ₱18,000 (rate × 30, this month), Ricalde "Days worked". On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `9931963`; the read-only Nov 1st-cutoff preview gives Violie R. Malana and John Roy C. Sibal 15 fixed days and Princess Kynna Ricalde days worked.

## 2026-11-12 16:35 — abaebea — NPW-HOLIDAY column on payroll step 3
- By: Claude Code (SSH key), requested by Kurt
- Code: `892fa2e` → `abaebea` (includes docs-only `e30169f`): step 3 shows the October 2026 sheet layout — NPW- HOLIDAY column after QUART ALLOW for unworked holidays, other absences under ABSENT in the deductions table, DAYS OF WORK as days actually paid, the typed holiday premium shown with overtime. Saved amounts and net pay are unchanged.
- Migrations: none
- Backup: none (front-end only)
- Data changes: none on live.
- Verified: 5 JS tests passed (incl. holiday in NPW- HOLIDAY, other absence in deductions, gross − deductions = net), build passed; on the local live-data copy, October 16–30 step 3 showed the NPW- HOLIDAY column and Yvonne N. Condo at ₱7,920.00 − ₱347.40 = ₱7,572.60. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `abaebea`.

## 2026-11-12 16:20 — 892fa2e — Fixed half-month basic pay for office staff
- By: Claude Code (SSH key), requested by Kurt
- Code: `5ba3485` → `892fa2e` (includes docs-only `236db74`): Monday-to-Friday staff get daily rate × 22 ÷ 2 per cutoff (11 days, fewer for weekdays before a hire date), minus unworked hours on counted days (absences, lates, NWNP holidays); staff on custom schedules (General Merchandise, relievers) stay on hours worked.
- Migrations: none
- Backup: none (no schema or data change; no payroll batches exist on live)
- Data changes: none on live.
- Verified: locally 412 of 417 PHP tests (5 GD-only) and 4 JS tests passed, build passed; on the local live-data copy the October 16–30 basic pay matches HR's October 2026 file for every Mon–Fri employee (₱7,920, ₱6,600, ₱8,800, ₱13,596, ₱9,677.91, ₱8,305). On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `892fa2e`; the read-only Nov 1st-cutoff preview gives 11 fixed days to the 9 Mon–Fri staff and days-worked pay to Princess Kynna Ricalde, Violie R. Malana and John Roy C. Sibal.

## 2026-11-12 16:05 — 5ba3485 — Warning when a net pay is below zero
- By: Claude Code (SSH key), requested by Kurt
- Code: `70a960b` → `5ba3485` (includes docs-only `eabe838`): payroll step 4 lists anyone whose net pay is below zero in a red warning; step 3 shows that net pay in red brackets. Saving is not blocked.
- Migrations: none
- Backup: none (front-end only)
- Data changes: none on live.
- Verified: build passed; on the local live-data copy as Katherine, October 2nd cutoff with a test loan of ₱9,000 typed for Yvonne N. Condo, step 4 showed "Net pay is below zero for 1 employee" with "Yvonne N. Condo: ₱ -1,427.40" (₱7,572.60 − ₱9,000); nothing was saved. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `5ba3485`.

## 2026-11-12 15:50 — 70a960b — Management Excel in the October 2026 layout
- By: Claude Code (SSH key), requested by Kurt
- Code: `b1fdacf` → `70a960b` (includes docs-only `8bc2568`, `5aa6040`): the NWNP holiday amount is saved on its own (`240f31a`); the Download Management Excel / mockup Excel now fill a template built from HR's October 2026 workbook (`scripts/build-payroll-template.py`; logos kept, signature pictures, names, amounts, formulas and the file's author removed); columns are found by header text; the unworked holiday goes in NPW- HOLIDAY, absences in the deduction tables; rows, journals and the voucher balance.
- Migrations: `2026_11_13_000002_add_nwnp_deduction_to_payroll_items`
- Backup: `~/db-backups/pmpc-before-october-export-20261112-0749.sql` (1.06 MB, dump completed)
- Data changes: none on live. Locally only, the `pmpc_live_preview` copy was migrated and its finalized draft #8 exported for a visual check.
- Verified: locally 26 export and wizard tests (incl. rows balance to the centavo, journals balance, NPW/ABSENT placement per sheet, six staff fit and seven are rejected, voucher print area follows the rename, no author/names in the template) and 407 of 412 PHP tests (5 GD-only), Pint clean; a fresh reviewer's two important findings were fixed. On live: server tree clean before and after, migration ran, app back up, login 200, HEAD `70a960b`; a rolled-back mockup export of the Nov 1st cutoff produced a 696 KB workbook with the "NOVEMBER 2026 VOUCHER" sheet, no stale sheet name, no leftover markers, and 0 payroll batches afterwards.

## 2026-11-12 16:30 — b1fdacf — Tax split per cutoff; Ferias' rent ₱1,250 per cutoff
- By: Claude Code (SSH key), requested by Kurt
- Code: `09b6391` → `b1fdacf` (includes docs-only `96841b6` and test-only `ce7bcde`): withholding tax is now half of the monthly amount on each cutoff, matching the October 2026 payroll file; SSS, PhilHealth and Pag-IBIG stay on the 1st cutoff only.
- Migrations: none
- Backup: `~/db-backups/pmpc-before-payroll-wizard-20261112-0629.sql` (both rent values are 2000.00 in it)
- Data changes: `employees.rental_deduction` from 2000.00 to 2500.00 (₱1,250 per cutoff) for Alexander L. Feria (id 3) and Alexander A. Feria Jr. (id 4), matching the October 2026 payroll file where all four Cubao staff pay ₱2,500 a month. Dry run first showed both at 2000.00. To undo: set them back to 2000.00.
- Verified: locally 28 payroll PHP tests and 3 JS tests passed, build passed. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `b1fdacf`; 2 rows updated; the read-only Nov 1st-cutoff preview shows rental ₱1,250 for all four Cubao staff and W/H tax ₱425 for Alexander L. Feria.

## 2026-11-12 15:55 — 09b6391 — Payroll-only access for Katherine
- By: Claude Code (SSH key), requested by Kurt
- Code: `757b447` → `09b6391` (includes docs-only `4917fc8`)
- Migrations: none
- Backup: none (no schema or data change; access comes from config `pmpc.payroll_processors`, default `EMP-0003`, no `.env` entry on the server)
- Data changes: none on live. Locally only, Katherine's account in the `pmpc_live_preview` copy got a temporary test password for the browser check.
- Verified: locally 404 of 409 PHP tests (the 5 signature tests need GD, missing on this machine), including new tests that a listed processor can open, save, mock up and finalize payroll but is turned away from the admin dashboard, employees, DTR and payroll analytics, and that other employees still cannot reach payroll; build passed. On the local live-data copy as Katherine: "Process payroll" link in her portal, payroll pages show only My attendance, My tasks and Payroll runs. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `09b6391`, `canProcessPayroll()` true for EMP-0003 and false for EMP-0004.

## 2026-11-12 15:35 — 757b447 — Payroll step 3 tables no longer overlap
- By: Claude Code (SSH key), requested by Kurt
- Code: `d011962` → `757b447` (includes docs-only `ce1476f`)
- Migrations: none
- Backup: none (front-end only)
- Data changes: none on live.
- Verified: build passed; on the local live-data copy in Chrome, step 3 for October's 2nd cutoff showed the payroll table and the deductions table side by side with a gap, no overlap, and sideways scrolling inside the sheet. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `757b447`.

## 2026-11-12 15:20 — d011962 — Download a mockup payroll Excel without saving
- By: Claude Code (SSH key), requested by Kurt
- Code: `aefa564` → `d011962` (includes docs-only `6a6fa08`, `50f55d1`, `6fa3513`)
- Migrations: none
- Backup: none (no schema change; the mockup rolls back every write it makes)
- Data changes: none on live. Locally only, live data was copied into the local `pmpc_live_preview` MySQL database, Kurt's account there got a temporary test password, and a local draft #8 was saved and finalized while trying the wizard.
- Verified: locally 400 of 405 PHP tests (the 5 signature tests need GD, missing on this machine), build passed; new tests check that the mockup downloads an .xlsx, leaves an existing draft unchanged and saves nothing. On the local live-data copy the October 2nd-cutoff mockup returned a 133 KB Excel file (HTTP 200) and no new batch appeared. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `d011962`, route `admin.payroll.mockup-export` registered. No mockup was run on live by Claude.

## 2026-11-12 14:55 — data only — Cubao rent for Kurt and Kath set to ₱1,250 per cutoff
- By: Claude Code (SSH key), requested by Kurt
- Code: none
- Migrations: none
- Backup: `~/db-backups/pmpc-before-payroll-wizard-20261112-0629.sql` (both values are 0.00 in it)
- Data changes: `employees.rental_deduction` (monthly, split in half each cutoff) from 0.00 to 2500.00 for Kurt Vincent Fariñas (id 12, EMP-0002) and Katherine Sevilleno (id 13, EMP-0003). The two Ferias (ids 3 and 4) stay at 2000.00 (₱1,000 per cutoff), as the owner asked. Dry run first showed the four Cubao values. To undo: set `rental_deduction` back to 0.00 for ids 12 and 13.
- Verified: 2 rows updated; the read-only Nov 1st-cutoff preview now shows rental ₱1,250 for Kurt and Kath and ₱1,000 for both Ferias.

## 2026-11-12 14:45 — data only — President's Nov 2 holiday DTR row removed
- By: Claude Code (SSH key), requested by Kurt
- Code: none
- Migrations: none
- Backup: `~/db-backups/pmpc-before-payroll-wizard-20261112-0629.sql` (taken 15 minutes earlier; this row is unchanged in it)
- Data changes: deleted `dtr_logs` id 761 for Alexander L. Feria (employee id 3) on 2026-11-02: punches 08:00–12:00 and 13:00–17:00, 8.00 hours, `on_time`, no IP address. It was written by the always-present auto-fill on Nov 3 at 12:59, one minute before the Nov 2 All Soul's Day holiday was added, so it would have paid him for a holiday (owner's rule: the President follows holidays like everyone else). Dry run first showed exactly this one row. To undo: re-insert the row from the backup (`dtr_logs` id 761).
- Verified: 0 rows left for him on Nov 2; the read-only Nov 1st-cutoff preview now shows Nov 2 as a holiday with 0 hours and 56 hours through Nov 11. The auto-fill only fills days after an employee's latest row and skips holidays, so it will not recreate the row.

## 2026-11-12 14:30 — aefa564 — Four-step payroll wizard with hours-based pay
- By: Claude Code (SSH key), requested by Kurt
- Code: `0f8b819` → `aefa564` (includes docs-only `cfaf68d`, `e60be29`, `d18454b`, `990f6a3`)
- Migrations: `2026_11_13_000001_add_payroll_month_and_hours_snapshots` (adds `payrolls.period_month` with a unique index on month + cutoff, and `payroll_items.paid_hours`, `scheduled_hours`, `day_resolutions`). The live `payrolls` table was empty, so nothing was backfilled.
- Backup: `~/db-backups/pmpc-before-payroll-wizard-20261112-0629.sql` (1.06 MB, dump completed, mode 600)
- Data changes: none on live. Locally only, a throwaway `wizard-preview.sqlite` with seeded DTR was used for the browser check and then deleted.
- Verified: locally 397 of 402 PHP tests (the 5 signature tests need GD, missing on this machine), build passed; a fresh reviewer found no critical issues, and its two important findings (an edited end date could repeat or drop days in the next cutoff; the editable start date had no effect) were fixed with tests. All four steps were walked on the local copy. On live: server tree clean before and after, migration ran, app back up, login 200, HEAD `aefa564`, unique index present. A read-only preview of the Nov 1st cutoff on live data shows Nov 2–13 with Nov 2 as NWNP, a DTR window from Oct 31, days counted through Wed, Nov 11, 12 staff, Violie and Sibal on 12-hour days, and one open day for Sibal. No payroll was saved on live.

## 2026-11-12 13:12 — 0f8b819 — Late tasks always at the top of Today
- By: Claude Code (SSH key), requested by Kurt
- Code: `53eb2bb` → `0f8b819` (includes docs-only `03f3d72`)
- Migrations: none
- Backup: none (front-end only; no database records or schema changed)
- Data changes: none on live. Locally only, one test task on `taskboard-preview.sqlite` was moved to Doing and back.
- Verified: locally 29 of 29 JS tests, build passed; on the scratch copy Today showed Late 5 / Due today 1 with no late task left in To do, and "Due today 0 · Nothing due today." after moving the due-today task to Doing. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `0f8b819`, bundle `app-BekOJyEK.js`. In Chrome as Kurt (read only): To do 12, Today 9 (Late 9, Due today 0, "Nothing due today."), Doing 4, Done 9, header the same, no late task left in To do.

## 2026-11-12 12:15 — 53eb2bb — Today tasks can move to Doing; To do can be hidden
- By: Claude Code (SSH key), requested by Kurt
- Code: `3f282d0` → `53eb2bb` (includes docs-only `196d3c5`, `a0a1265`, `1c4a914` and `814b1ba`, `6960531`)
- Migrations: none
- Backup: none (front-end only; no database records or schema changed; the hidden-To-do choice lives in each browser)
- Data changes: none on live. Locally only, test tasks on `taskboard-preview.sqlite` were moved between columns during the browser check.
- Verified: locally 29 of 29 JS tests, 373 of 378 PHP tests (the 5 signature tests need GD, missing on this machine), build passed; a fresh reviewer found no critical issues and its label, focus and count findings were fixed; on the scratch copy drag Today → Doing (amber, "Due today") and back, drop on Today → To do, hide/show To do, reload keeps it, phone width. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `53eb2bb`, bundle `app-BmXk8orn.js`. In Chrome as Kurt: Team tasks shows To do 21, Today 0, Doing 5, Done 8 with matching header; Hide moved 9 late tasks to Today under "Late", "Show To do (21)", header 12 to do / 9 today; shown again afterwards. No tasks were moved on live.

## 2026-11-12 11:34 — 3f282d0 — UI polish phases and message box fixes
- By: Claude Code (SSH key), requested by Kurt
- Code: `6411dd4` → `3f282d0` (includes `abfeec0` docs-only and `fa6034a`)
- Migrations: none
- Backup: none (front-end only; no database records or schema changed)
- Data changes: none on live. Locally only, the scratch database `taskboard-preview.sqlite` got a test password on one employee, a test due ("UI test water bill") and its November line's date trimmed to `2026-11-05`.
- Verified: a fresh reviewer read the diff (verdict: ship with fixes); its findings 1 to 6 were fixed in `3f282d0`. Locally: build passed, 27 of 27 JS tests, 373 of 378 PHP tests (the 5 signature tests need GD, missing on this machine); Dues Undo payment and Stop → Undo restored the same data with a single message; a Settings save showed one message and none after two background refreshes. On live: server tree clean before and after, nothing to migrate, app back up, login 200, HEAD `3f282d0`, new bundle `app-Cezri_8a.js`. In Chrome as Kurt (read only): 15 pages load with the page header first and no errors, small text is 11.2px, no stray messages during 45 seconds of background refreshes. No save was done on live this time.

## 2026-11-12 11:09 — 6411dd4 — One message box for save results, errors and empty lists
- By: Claude Code (SSH key), requested by Kurt
- Code: `a346156` → `6411dd4` (includes the docs-only commit `37540a0`)
- Migrations: none
- Backup: none (front-end only; no database records or schema changed)
- Data changes: none on live. Locally only, the scratch database `taskboard-preview.sqlite` got a new test password on ADM-0001 for the browser check.
- Verified: locally the build passed, 27 JS test files passed, and 373 of 378 PHP tests passed (the 5 signature tests need the GD extension missing from this machine's PHP). On the scratch copy: wrong login shows only the inline error; saving Settings shows the success box bottom-right on desktop and under the top bar on phones; an Employees search with no match shows the new empty state; no console errors. On live: server tree clean before and after, nothing to migrate, app back up, login returns 200, HEAD `6411dd4`, login page serves the new bundle `app-CMDgX48c.js`. Not yet checked while signed in on live.

## 2026-11-12 10:45 — a346156 — Today column after To do; Dues hidden from the menu
- By: Claude Code (SSH key), requested by Kurt
- Code: `4d2ed16` → `a346156` (includes the docs-only commit `0ac16c0`)
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed; Dues records untouched)
- Data changes: none
- Verified: locally 27 of 27 JS tests and 372 of 372 PHP tests pass (the JPEG-only signature test excluded); build passed; on the scratch copy the columns read To do, Today, Doing, Done with late cards at the top of To do, and /admin/dues still opens. On live: server tree clean before and after, nothing to migrate, app back up, login returns 200, HEAD `a346156`. In Chrome as Kurt (read only): Team tasks columns To do 21, Today 0, Doing 5, Done 8, header the same; late cards at the top of To do; Dues no longer in the menu; no console errors.

## 2026-11-12 10:42 — 4d2ed16 — Team tasks header matches the columns; Manila dates after midnight
- By: Claude Code (SSH key), requested by Kurt
- Code: `ba3264a` → `4d2ed16` (includes the docs-only commit `e1675f1`)
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: locally 27 of 27 JS tests and 372 of 372 PHP tests pass (the JPEG-only signature test excluded; it needs JPEG support missing from this machine's PHP); build passed; the stronger `done_on` test was seen failing with the Manila conversion removed. On live: server tree clean before and after, no pending migrations, app back up, login returns 200, HEAD `4d2ed16`. In Chrome as Kurt (read only): Team tasks header reads 13 today & late, 12 to do, 1 doing, 8 done this week, the same as the four columns; no console errors.

## 2026-11-12 10:34 — ba3264a — Today view on My tasks; Today & late column on the task boards
- By: Claude Code (SSH key), requested by Kurt
- Code: `fcfb4e2` → `ba3264a` (includes the docs-only commit `3bab572`)
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed — tasks now also send a `done_on` date read from `updated_at`)
- Data changes: none
- Verified: locally 26 of 26 JS tests and 377 of 378 PHP tests pass (the remaining one needs JPEG support missing from this machine's PHP); build passed; a fresh reviewer found no critical or important issues. On live: server tree clean before and after, no pending migrations, app back up, login returns 200, HEAD `ba3264a`. In Chrome as Kurt (read only, nothing moved or ticked): Team tasks shows Today & late (13), To do (12), Doing (1), Done (8) with Show older (8); My tasks opens on Today with "Nothing due today" and one task under Coming up tomorrow; no console errors on either page.

## 2026-11-11 17:22 — fcfb4e2 — Mark holiday on the dashboard; added holidays removed
- By: Claude Code (SSH key), requested by Kurt
- Code: `200fb8b` → `dcf1508` (Mark holiday button) → `fcfb4e2` (hotfix: the first release sent the holiday types as objects and opening the form blanked the dashboard; it was live for about 3 minutes and nothing was saved through it)
- Migrations: none
- Backup: none (code-only deployment; the data change removed five rows that were added earlier today and are listed below)
- Data changes: removed the five holidays Claude added at 17:13 (ids 2–6: Nov 30 Bonifacio Day, Dec 8 Feast of the Immaculate Conception, Dec 25 Christmas Day, Dec 30 Rizal Day, Dec 31 Last Day of the Year), so the admin marks holidays instead. Listed by id in tinker first, then deleted by id; only All Soul's Day (Nov 2, id 1) remains. Undo: add them again with Mark holiday or in Settings → Holidays. Also corrected the times of the two earlier entries today, which had been written in UTC (09:06 → 17:06, 09:13 → 17:13).
- Verified: locally 375 of 376 tests pass (the remaining one needs JPEG support missing from this machine's PHP), including a new one for the dashboard's holiday types; Pint clean; build passed. On live: server tree clean before and after, no pending migrations, app back up. In Chrome as Kurt the Mark holiday button opens the form with today's date and the three types, no console errors; closed with Escape, nothing saved.

## 2026-11-11 17:13 — 200fb8b — Night-shift double tap refused; holidays and CFT amount added
- By: Claude Code (SSH key for the deploy; Chrome as Kurt for the data), requested by Kurt
- Code: `f1aa72f` → `200fb8b`
- Migrations: none
- Backup: none (code change touches no schema; the data changes were single rows added or filled through the app's own forms)
- Data changes: (1) Settings → Holidays: added Bonifacio Day Nov 30 (regular, id 2), Feast of the Immaculate Conception Dec 8 (special, id 3), Christmas Day Dec 25 (regular, id 4), Rizal Day Dec 30 (regular, id 5), Last Day of the Year Dec 31 (special, id 6). Undo: Remove each in Settings → Holidays. (2) Dues: CFT Nov 3 occurrence (id 4) amount set to ₱27,057.05, the Loan ₱12,757.05 + Savings ₱14,300 written in its note, for this month only. Undo: clear the amount on that line in Dues. Dec 24 was not added (not confirmed as a 2026 holiday).
- Verified: locally 374 of 375 tests pass (the remaining one needs JPEG support missing from this machine's PHP), Pint clean; a new test shows a time out 11 minutes after time in is refused and a later one is accepted. On live: server tree clean before and after, no pending migrations, app back up, login returns 200, the new guard is in the deployed file. Tinker (read-only) lists holidays ids 1–6 with the dates above and CFT occurrence 4 at 27057.05; the Dues page shows Due this month ₱52,001.72 with 2 dues still without an amount.

## 2026-11-11 17:06 — f1aa72f — DTR hours count only shift time minus lunch
- By: Claude Code (SSH key), requested by Kurt
- Code: `8e8b278` → `f1aa72f`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none. Days already saved keep their old hours; only new punches and corrections use the new rule.
- Verified: locally 373 of 374 tests pass (the one failure is the signature upload test, which needs JPEG support missing from this machine's PHP), Pint clean; no frontend change, so no build. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200. In tinker on live, an unsaved log with Diana's Nov 3 punches (07:51, 13:00, 13:00, 17:00) computes 8 hours, on time (was 9.15); nothing saved. No new errors in the Laravel log.

## 2026-11-11 12:41 — 8e8b278 — New Task date section asks two plain questions
- By: Claude Code (SSH key), requested by Kurt
- Code: `5583f76` → `8e8b278`
- Migrations: none
- Backup: none (code-only deployment; no database records or schema changed)
- Data changes: none
- Verified: full suite 372 of 372 and 17 of 17 JS tests locally (PHP 8.3 with GD on), build passed; no separate review (form-only change). On a local test copy, six tasks were saved through the new form (range + monthly, range + weekly, range + just once, one day + monthly, one day + just once, no date) and each stored the right dates and repeat rule; no overflow at 375px. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200. Opened New Task on Team tasks in Chrome as Kurt: both questions show with their choices, and A range of days + Monthly + 16 to 20 reads "Every month, from the 16th to the 20th. First one: Nov 16 → Nov 20." Then cancelled; no console errors. Nothing was saved on live.

## 2026-11-11 12:08 — 5583f76 — Repeating tasks can show as date spans
- By: Claude Code (SSH key), requested by Kurt
- Code: `4aba7f7` → `5583f76`
- Migrations: `2026_11_11_010000_add_show_as_span_to_recurring_tasks_table` (adds `recurring_tasks.show_as_span`, default false; `down()` drops the column).
- Backup: `~/domains/peoplescoopdtr.online/db-backup-2026-11-11-recurring-span.sql` (taken 12:07 Manila; 27 tables, 955 KB).
- Data changes: none. All 6 existing repeat rules keep `show_as_span` off and behave as before.
- Verified: full suite 372 of 372 locally (PHP 8.3 with GD on), build passed; no separate review (small change). On a local test copy: created a monthly repeat for day 20 with 4 days before and the tick on through New Task; the card read "Starts Nov 16 → Nov 20" with Upcoming and the repeat marker. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200, column present. Opened New Task on Team tasks in Chrome as Kurt, chose Recurring, saw the "Show these days as a date span" tick, then cancelled; no console errors. Nothing was saved on live, so no spanned repeat exists there yet.

## 2026-11-11 12:00 — 4aba7f7 — Task date spans and tidier Team tasks page
- By: Claude Code (SSH key), requested by Kurt
- Code: `0853203` → `4aba7f7`
- Migrations: `2026_11_11_000000_add_start_date_to_tasks_table` (adds nullable `tasks.start_date`; `down()` drops the column).
- Backup: `~/domains/peoplescoopdtr.online/db-backup-2026-11-11-task-start-date.sql` (taken 11:58 Manila; 27 tables, 951 KB).
- Data changes: none. All 65 existing tasks keep an empty `start_date` and look as before.
- Verified: full suite 366 of 366 locally (PHP 8.3 with GD on), build passed, fresh whole-branch review with its two fixes applied (red late pill, bounded calendar span loop). On a local test copy: board, Upcoming filter, calendar spans and creating a Date span task through New Task, at desktop and 375px. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200, `start_date` column present. Opened Team tasks in Chrome as Kurt (read-only): counts in the header with the late count in red (14), office, person and priority dropdowns, Late only 14 / Upcoming 0 / Old completed chips, no sideways overflow, no console errors. Nothing was saved on live, so a Date span task has not yet been created on the live site, and the employee My tasks form has not been seen on screen.

## 2026-11-05 20:15 — 0853203 — Dues page, and five bills moved from tasks to dues
- By: Claude Code (SSH key), requested by Kurt (fast release: "no testing, just push to main and live")
- Code: `a75d152` → `0853203`
- Migrations: `2026_11_06_000000_create_dues_tables` (new `dues` and `due_occurrences` tables). Not tried on a scratch MariaDB before release; `down()` drops the two tables whole (no lone index drops).
- Backup: `~/domains/peoplescoopdtr.online/db-backup-2026-11-06-dues.sql` (taken 20:14 Manila on Nov 5; the file name carries the migration's date, not the day it was taken; 25 tables).
- Data changes: `php artisan dues:import-from-tasks` (dry run first and reviewed, then `--apply`) created 5 dues from the 5 active monthly whole-office repeating tasks in Cubao and stopped those 5 repeat rules: Jason Bajet (9th), Sir Fajilagutan (23rd), Maria Luz Cabanilla (27th, PHP 18,108.19 found in the notes), CFT (3rd; two amounts in its notes, so left empty), Dumalag (5th, PHP 6,836.48). Titles lost their "- Every ..." suffix; the notes were kept as they were. The existing task copies on the board were NOT touched. To undo: delete the 5 dues in Admin > Dues > Manage dues (or `Due::query()->delete()`), then set `recurring_tasks.active = 1` for ids 1 to 5.
- Verified: nothing was run in the test suite or a browser (owner asked for no testing). `npm run build` and PHP syntax checks passed before the push. On live: server tree clean before and after, no pending migrations, app back from maintenance mode, login returns 200, all 8 `admin.dues` routes registered. The Dues page controller was run on the server against the live data (not through the browser): November shows 5 lines, total 24,944.67 known amounts, 1 overdue (CFT, Nov 3), 3 with no amount yet. The page itself (layout, Mark paid and the other buttons) has NOT been seen on screen: Chrome was not connected.

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
