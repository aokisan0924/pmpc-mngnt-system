# DTR current-day highlight, 2026-10-16

## Confirmed behavior

- Both employee attendance logs and the admin individual DTR show a portal-colored current-day row with a Today label. Employee mobile cards receive the same treatment.
- Today uses the existing employee `today.date` value and a new admin `today_date` Inertia prop generated explicitly in Asia/Manila.
- Opening the current month, switching employee or returning from another month centers today once. Hidden desktop/mobile duplicates are ignored. Missing dates are a no-op.
- Background data refreshes and correction responses preserve the reading position. Historical months do not highlight another date. Reduced-motion users receive immediate scrolling.

## Verification

- Backend: 115 tests passed, 903 assertions, using PHP 8.3.33. New coverage verifies that Manila's date is October 16 while UTC is still October 15, for both current and historical month responses.
- Playwright: six tests passed against the real DTR React pages with synthetic Inertia fixtures. Employee/admin desktop/mobile, visible current-day targeting, light/dark highlight styles, month navigation, background updates, admin correction responses and missing-today behavior were exercised. No production correction was submitted.
- Pint and Git whitespace checks passed. The isolated production Vite build passed using production frontend source, Blade and pagination sources, and the existing public Vite notification settings.
- Live admin: a fresh authenticated browser tab displayed October 16 with a Today label and a full-row tint, automatically brought into view. Previous September had no highlighted row; returning to October scrolled to today. The mobile viewport also showed the highlighted date. Fresh-tab console error log was empty.
- The current administrator session redirects the employee attendance route to the admin dashboard. Employee rendering was verified with local synthetic fixtures, not a live employee session. Light mode remains the application's enforced theme; dark styling was tested locally only.
- Live screenshot: `output/dtr-today-live-admin.jpg`. Synthetic employee mobile screenshot: `output/dtr-today-employee-mobile.png`.

## Deployment and rollback

- Deployed directly to the existing Laravel app at `/home/u512373751/domains/peoplescoopdtr.online/pmpc_mngnt`. The public build symlink remains unchanged.
- Only the two DTR React sources, shared scroll hook, admin controller and matching generated build were deployed. Existing hashed assets were retained. All 48 deployed source/build files matched locally generated SHA-256 checksums.
- Private backup: `/home/u512373751/domains/peoplescoopdtr.online/.codex-backups/dtr-today-20261016/originals.tar.gz`. It contains the original DTR pages, admin controller and Vite manifest. Restoring those files to the app root restores the previous runtime; the newly added unused hook and retained assets can remain.
- Isolated source/build staging: `storage/app/dtr-today-release` locally and `/home/u512373751/domains/peoplescoopdtr.online/.dtr-today-20261016` on the server.
- No migrations, attendance writes, payroll operations or production correction submissions were performed. Existing unrelated local edits and build outputs were preserved. Changes remain uncommitted; no release version was assigned.
