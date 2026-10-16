# Live DTR checklist, October 16, 2026

## Completed and verified live

- Missing past scheduled workdays appear as Absent even when the employee never opened the site. Dates are derived for display, not backfilled as artificial punch records. Rest days, holidays, pre-employment dates and always-present exceptions remain respected.
- Employee attendance shows every day of the selected month, week separators and a seven-day Monday-Sunday strip. Admin and employee screens use In progress for today's incomplete attendance. Future days are Upcoming; future absence notices are Planned absence.
- Report absence requires a workday within the next 90 days, a reason and explicit confirmation. An employee can cancel today's or a future notice before punching. Report and cancellation notify HR. Notices are not approved leave. Ownership checks prevent modifying another employee's notice.
- DTR summaries count displayed statuses, excluding future attendance. Payroll and 13th-month weighting are unchanged. PDF output has solid colors, weekly separators, repeated headings, explanations and reported reasons. Typical 31-day records render on one A4 page; extensive reasons can continue onto another page. Newly generated archives use the same statuses.
- Created Violie R. Malana (EMP-0005) and John Roy C. Cibal (EMP-0006), both active Employee accounts, General Merchandise, Store Keeper. Each has a government-ID companion record. Real emails and hire dates remain unset. General Merchandise is selected as their office, with normal employee setup and HR verification still required. Credential validation succeeded without signing into or changing their sessions.
- Made email optional in employee creation, editing, account setup and HR setup review. Supplied addresses remain validated and unique. Employees without email sign in with employee ID; email-based password recovery requires a real address.

## Princess Kynna Ricalde

- Existing live account: EMP-0004, Reliever, Saturday/Sunday workdays, daily rate PHP 600.
- Existing personal shift: 08:00-20:00, effective October 15, 2026. These settings were verified and preserved.
- User confirmed PHP 50 per hour for a 12-hour duty, PHP 600 per shift, paid through petty cash. Petty-cash payment remains an external/manual process; no disbursement, payroll finalization or automated payment-source tracking was added.
- The live database currently stores October 10, 2026 as her hire date. The user does not know her actual start date. It was preserved, not verified as historical fact. October 10 and 11 currently appear absent because that stored date makes them scheduled days and there are no punches. Confirm the hire date and any missing attendance before using those absences for pay decisions.

## Remaining HR details

- Confirm Princess's actual hire date and any missing reliever attendance.
- Confirm both new storekeepers' hire dates, weekly schedules, compensation and contact details. They complete normal setup and signature submission after first sign-in. No historical hire dates, salaries or attendance were invented.
- Give each employee only their own initial credentials privately and have them change the initial password through Profile. The credential file is outside the repository and restricted to the local Windows user; no passwords are included here.

## Verification and deployment evidence

- 101 runnable backend tests passed with 745 assertions. One existing signature test was separately blocked by missing local PHP JPEG support and excluded from the final run. DTR/absence, account creation, employee-ID login, nullable-email HR review and one-page PDF cases passed.
- Pint, production Vite build and Git whitespace checks passed. Both new migrations applied, rolled back and reapplied on a disposable SQLite database. The normal local attendance fixture was not migrated or replaced.
- Live release: 69 deployed files matched their expected SHA-256 hashes; all 42 manifest assets existed. Live browser showed the complete employee month, seven-day strip, absence confirmation form, corrected admin roster and both new accounts. Browser console contained no errors.
- Production Diana Pasco and Princess PDFs were generated through the deployed controller, downloaded over SSH, text-checked and rendered for visual inspection. Each was one page. The Print DTR link's new-window behavior did not emit a download event, but direct navigation to the same authenticated PDF route downloaded successfully through the in-app browser. That downloaded one-page PDF was independently checked for Diana's name, status labels and 78.14 hours.
- Live Diana example: October 9 and 13 Absent, October 16 In progress, October 17 Rest day, October 19 Upcoming. The always-present president's displayed October present count is 11, excluding future days.
- Final audit confirmed all 537 existing DTR rows, 13 existing employee rows, settings and payroll tables unchanged. Only the two requested employee accounts and their government-ID rows were added, plus the two schema migrations. No production absence notices were submitted for testing.
- Backup: `/home/u512373751/domains/peoplescoopdtr.online/.codex-backups/dtr-20261016-082030`. Main source originals, the previous manifest and scoped database/schema snapshots are retained there. The original AccountSetupService file was not captured before its incremental patch; its local Git HEAD baseline is retained separately under `recovered-git-baseline` with provenance noted.
- Staging and final audit: `/home/u512373751/domains/peoplescoopdtr.online/.dtr-fix-20261016`.
- Existing saved ZIP archives were not regenerated. Source and generated assets remain uncommitted; no release version was assigned.
