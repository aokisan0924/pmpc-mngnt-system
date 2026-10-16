# PMPC WorkForce audit and discovery

Date: 2026-10-16, Asia/Manila. Status: All eight reproduced findings and two follow-up races fixed and deployed; production smoke checks and data-preservation checks passed.

## Summary and agreed boundaries

Audit both portals for correctness, access control, usability, reporting and reliability. Produce findings and recommended fixes before changing production application code. Live employee workflow writes are restricted to dedicated audit accounts; payroll writes, approvals and finalization are tested in isolation. Preserve existing worktree changes and real employee records.

## Discovery record

### Goal
- User: "can you check, open, audit for everything, maybe there are inconsistencies, broken things idk just find sometyhing".
- User invoked grill-me. Checkpoint writes were deferred during Plan mode and are being recorded now that execution is enabled.

### Live verification choice
- Asked how workflows that save changes should be verified.
- User selected: "Dedicated live test accounts".

### Live write boundary
- Asked how far dedicated live-account tests should go.
- User selected: "Employee workflows only (Recommended)".
- This means punches, absence notices/cancellation, planner and permitted profile updates on test identities. No live payroll saves, approvals, finalization, or real employee attendance modifications.

### Browser tool
- User requested trying https://github.com/denver6000/denver6000-multi-role-browser.
- Published package multi-role-browser@0.1.1 and source were inspected. Installed outside the application in the user-local Codex tools directory. Chromium and an MCP SDK bridge successfully opened two independent employee browser sessions, signed them in, and exercised live workflows.
- The tool provides open/snapshot/click/fill and actor lifecycle controls. It does not provide screenshots, arbitrary HTTP methods, or PDF inspection. Existing in-app browser access supplemented read-only administrator checks; isolated Laravel tests covered request tampering and financial writes.

## Findings confirmed before execution

### WF-A01: Existing inactive sessions can save attendance punches
- Priority: High. Local reproduction, with relevant source SHA-256 matching production.
- The employee DTR route group has only auth middleware. EnsureRole checks active status, but does not wrap the shared DTR routes. DtrController::punch does not check active status.
- In-memory reproduction: authenticate an inactive synthetic employee, POST /employee/dtr/punch; response 302 and AM punch saved. No production records were changed by this reproduction.
- Recommendation: consistently reject inactive sessions across all authenticated routes, including shared employee endpoints. Add regression tests for inactive reads and writes.

### WF-A02: Dashboard overcounts half-days and estimated earnings
- Priority: Medium. Local reproduction, with relevant source SHA-256 matching production.
- EmployeeDashboardController counts every non-absent DTR row as one day, while DTR display uses weighted days.
- In-memory reproduction: one past half-day, daily rate PHP 600. Dashboard: 1 day and PHP 600 estimated basic. DTR display: 0.5 days. This is a dashboard estimate discrepancy; no saved payroll overpayment was demonstrated.
- Recommendation: align dashboard attendance metrics and estimates with the intended shared weighting, while retaining the office-reviewed payroll policy.

## Additional reproduced findings

### WF-A03: Tasks due today are immediately overdue
- Priority: Medium. Reproduced in the live browser on audit employee A and in an isolated test.
- A newly created task due October 16 displayed Overdue on the morning of October 16. TaskController.php:30 compares a date cast at midnight using isPast().
- Impact: current-day work appears late before the due day has ended.
- Recommendation: compare the due calendar date to today in Asia/Manila. Keep pending tasks due today distinct from overdue tasks.

### WF-A04: Notification response contradicts its saved read state
- Priority: Low. Isolated reproduction; controller SHA-256 matches production.
- NotificationController.php:26 maps is_read before lines 30-33 mark the records read. The first response says false while the database already contains read_at.
- Impact: the notification page can show unread styling after opening it cleared the unread count.
- Recommendation: choose one consistent read policy and serialize the resulting state. Avoid changing read state during an unrelated page prefetch.

### WF-A05: Global schedule accepts reversed shift and lunch times
- Priority: Medium. Isolated POST reproduced; controller SHA-256 matches production.
- SettingsController.php:57-60 validates H:i format without chronological relationships. A 20:00 start, 08:00 end, 13:00 lunch start and 12:00 lunch end were saved without errors.
- Impact: an administrative input mistake can make attendance calculations and displayed targets inconsistent.
- Recommendation: validate the supported schedule order before saving any setting. If overnight shifts are intended, model that explicitly rather than accepting ambiguous reversed times. Save the setting group atomically.

### WF-A06: Payroll dates can contradict the selected cutoff
- Priority: Medium. Isolated full payroll POST saved successfully; request and controller SHA-256 match production.
- StorePayrollRequest.php:28-30 checks chronological order and first/second membership, but does not connect cutoff to dates. A batch covering October 16-31 was saved as first cutoff.
- Impact: labels and cutoff-dependent calculations can disagree with the attendance period. The same problem can admit overlapping periods that evade the exact-period duplicate check.
- Recommendation: validate first cutoff as the 1st-15th and second as the 16th-month end, in one month, for both preview and save. If exceptional periods are intended, require an explicit policy and label.

### WF-A07: Login has no application-level attempt limit
- Priority: Medium security hardening gap. Local route/controller review and isolated request reproduction; authentication controller and routes match deployed source.
- Twenty consecutive failed requests received normal login validation responses without a lockout or HTTP 429. POST /login has web and guest middleware only; no application RateLimiter or throttle was found.
- Impact: the application itself does not slow repeated password guessing.
- Recommendation: add account-and-IP throttling with a clear retry message. No live brute-force traffic was generated. Hostinger or other perimeter protections were not established by this test, so this is not a claim that every network-level control is absent.

### WF-A08: A stale draft-delete request can remove a newly finalized payroll
- Priority: High. Deterministic isolated interleaving reproduced; controller SHA-256 matches production.
- PayrollController.php:287-296 checks isFinalized() on the already-loaded model before its transaction. Unlike finalize(), destroy() never locks and reloads the payroll row.
- Reproduction: load a draft as deletion would; finalize the database row; pass the earlier model to destroy(). The finalized row is deleted. This models the vulnerable request ordering, not a production incident or a measured concurrent-load experiment.
- Impact: overlapping admin actions can bypass finalized-payroll immutability.
- Recommendation: lock and reload the payroll inside the deletion transaction, then check finalization before deleting its items or header. Add a regression for a stale model and verify database-engine concurrency separately.

## Initial dependency advisories, before updates

- Composer audit returned 27 advisories across six packages: dompdf/dompdf v3.1.5, guzzlehttp/guzzle 7.14.1, laravel/framework v13.19.0, league/commonmark 2.8.3, league/flysystem 3.35.2 and symfony/http-foundation v7.4.14. Their installed production versions were checked directly; composer.lock SHA-256 also matches local.
- npm audit returned five affected development-dependency entries: concurrently, shell-quote, nanoid, postcss and source-map-js. The full scan includes one critical and four high entries. npm audit --omit=dev returned zero findings. A development dependency advisory is not proof that a visitor can exploit the deployed frontend.
- The PHP advisories include PDF resource/path handling, HTTP behavior, Markdown parsing and a Laravel debug-page issue. Production APP_DEBUG is false. Do not equate an advisory count with 27 exploitable application vulnerabilities. No exploitation was attempted.
- Recommendation: prioritize a separately reviewed PHP dependency update and targeted PDF/HTTP regression checks, then update development tooling. Do not run an indiscriminate audit fix against the live application.
- Raw tool evidence: output/workforce-audit/composer-audit.json, npm-audit.json and npm-production-audit.json. These contain individual upstream advisory links and affected ranges.

## Checks that passed

- Main isolated backend suite: 101 tests, 749 assertions passed. This includes punch sequencing, absence reporting, employee-ID accounts, account setup/HR review, government-ID authorization, DTR correction permissions, payroll calculations/exports, finalized payslip handling and 13th month accuracy/immutability tests.
- Additional audit probe: nine tests, 121 assertions passed. Eight reproduce the findings above; one verifies another employee cannot toggle the owner's task. These assertions intentionally demonstrate current defects, rather than certify them fixed. Probe code and results are under output/workforce-audit/.
- Live dedicated actors: employee-ID login succeeded independently; employee B was redirected away from the admin dashboard; A's task was absent from B's planner; A's task creation and completion worked.
- Live absence: a reason and confirmation saved today's notice; attempted clock-in was rejected; cancellation restored attendance; AM In advanced to AM Out. Monthly DTR displayed In Progress. No extra fake shift completion was entered.
- Live read-only admin screens rendered: attendance roster, payroll list, account setup queue, employee directory, DTR edit requests, payroll analytics, 13th month overview, archives and settings. Empty payroll/analytics/archive states matched the database. These observations are page checks, not proof of every workflow.
- Employee payslip empty state and email-less profile rendered. The disabled email field identifies administrator ownership.

## Live test cleanup and data preservation

- Dedicated audit IDs 17 and 18 (EMP-0007/EMP-0008), clearly named AUDIT ONLY, were created as non-staff accounts with zero rate. They were excluded from active staff payroll selection. They are now inactive and their database sessions were revoked; browser contexts were closed.
- The audit retained two test DTR rows, one completed test task and six admin notifications generated by reporting/cancelling the test absence. No test payroll or 13th month batch was created live.
- Before/after SHA-256 comparisons over every pre-existing row confirmed unchanged original data in employees, dtr_logs, payrolls, payroll_items, thirteenth_month_pays, settings, tasks, notifications, dtr_edit_requests and account_setup_requests. Counts: 15 original employee rows, 539 DTR rows, 24 tasks, 320 notifications, 172 edit requests, 11 account setups and 16 settings. Financial tables were empty and remained empty.
- Sanitized cleanup result: output/workforce-audit/close-results.json. Server baseline and after-results are private, outside the public web root. Credentials are kept outside the repository and are not included here.

## Resolution and production verification

- Deployed the audit fixes to the live Laravel application on 2026-10-16. Production runs PHP 8.3.35. No database migrations were pending or added for this release.
- Live route inspection confirms shared DTR endpoints require `auth` and `role:employee,super_admin`; logout remains on `auth` without the employee role gate.
- Shared employee routes now use the existing role middleware, which also checks account status. Dashboard attendance uses half-day weighting; automatic 13th-month days are clipped to the selected period, hire/account start and today. Due-today tasks remain on time, notification reads are explicit, schedules and payroll cutoffs are validated, and login attempts are rate limited by normalized login and IP.
- Payroll draft deletion and DTR edit approval/decline now reload and lock records before acting. An active absence notice explains why clocking is paused and provides a cancellation action.
- Composer dependencies were updated within the PHP 8.3 platform constraint. Production versions include Laravel v13.36.0, Dompdf v3.1.6 and Guzzle 7.15.5. `composer audit --locked` reports no advisories. The npm lockfile updates the affected development tools; `npm audit` and `npm audit --omit=dev` both report zero vulnerabilities.
- Local verification passed: 12 audit regressions (117 assertions), the full backend suite (114 tests, 881 assertions), Pint, and the Vite production build. The JPEG signature replacement case passed under PHP 8.3.35 with GD JPEG support.
- The live login page and both new JavaScript assets returned HTTP 200. Dedicated employee accounts EMP-0007 and EMP-0008 rendered Dashboard and Attendance; Planner rendered its existing completed due-today task, and Notifications loaded without changing pre-existing notification records. The pending due-date boundary is covered by regression tests. Deactivating EMP-0008 while its session was open redirected the next employee request to login with the deactivation message.
- Both audit accounts are inactive again and have no remaining database sessions. Pre-smoke and post-smoke SHA-256 snapshots match for all 12 checked business tables: employees, government IDs, DTR logs, edit requests, tasks, notifications, payrolls, payroll items, 13th-month pays, settings, holidays and account setup requests. Payroll tables remained empty. No real employee attendance or payroll records were changed.
- The server backup is outside the public web root at `/home/u512373751/.pmpc-audit-backup-20261016-01`. The Vite manifest now references the employee dashboard patch while the existing DTR bundles remain in place.

## Limitations and remaining checks

- This is a broad first pass, not exhaustive certification. No live payroll save, HR approval or finalization was performed.
- The repository’s automated browser suite still depends on an external scratch reset script and fixed demo credentials. Production checks used dedicated browser actors; a full responsive, keyboard and screen-reader sweep remains open.
- The concurrency regressions are covered by deterministic tests, and production now uses row locks. No concurrent MySQL load test or live payroll transaction was run.
- Automatic 13th-month attendance is now clipped to the selected period, hire/account start and today. Saved historical payroll and 13th-month batches were not changed.
- Unbounded task/notification lists are a scaling concern. No production performance threshold failure or benchmark was demonstrated.
- Maintainability: repeated attendance/status calculations and inline validation make consistency harder to enforce. Prefer focused reuse when fixing concrete findings; a broad architectural rewrite is unnecessary.

## Remaining verification

1. Run the full responsive, keyboard and screen-reader sweep.
2. If stronger concurrency evidence is needed, use a dedicated test database or disposable payroll fixture to exercise MySQL row-lock interleavings.
3. Revisit task and notification pagination if production usage or performance measurements justify it.

## Evidence and coverage

Evidence files and temporary test tooling belong under output/workforce-audit/ or the user-local tool directory. Do not put credentials, session cookies, personal contact details or signature images in this report.
