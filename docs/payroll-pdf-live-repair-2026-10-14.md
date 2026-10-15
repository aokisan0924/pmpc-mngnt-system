# Live payroll PDF repair

Date: 2026-10-14, Asia/Manila. Site: https://peoplescoopdtr.online.

The production log confirmed `Cannot redeclare p()` while generating multiple employee payslips. The individual template also used flexbox and a gradient behind white net-pay text, which DomPDF did not render correctly. The saved-batch download link sliced a formatted date into `Sep 01,` instead of passing a calendar month.

## Deployed scope

- Replace the template's global currency helper with a view-local closure and use DomPDF-compatible table layouts, DejaVu Sans, and a solid net-pay background.
- Add the compatible `payroll.month_key` response field and use it in the existing download link.
- Rebuild the frontend from the downloaded production source, preserving its existing behavior and excluding unrelated local changes. Upload the matching assets before atomically activating the manifest; keep old hashed assets available for existing sessions and rollback.
- No migrations, payroll recalculation, employee changes, finalization, or record deletion were performed for this repair.

## Evidence

- Production-root patch rendered individual first, second, and combined cutoffs on one page, and ten synthetic employees on ten pages.
- Laravel Pint passed for the new rendering regression test. The local backend suite passed 71 tests and 608 assertions using an isolated in-memory database; the production-source Vite build passed.
- All 41 deployed files matched release checksums. Production payroll headers and items had identical fingerprints before and after activation: one draft batch, ten items.
- The live batch download link now uses `month=2026-09`. Clicking it downloaded a valid ten-page PDF, with visible peso symbols and net pay. The ten PDF net amounts sum to the saved batch net total of PHP 30,947.05.
- The deployed individual-download controller generated a valid one-page PDF whose stored earnings, deductions, and net pay match the draft. This final individual check ran through SSH because the in-app browser blocked a second automatic download; the bulk download was verified through the live UI. A final payroll fingerprint check remained unchanged.

## Rollback

Original controller, template, page source, and manifest are backed up outside the public document root at `/home/u512373751/domains/peoplescoopdtr.online/.codex-backups/payroll-pdf-20261014-194105`. Restore those four files and clear compiled Blade views to roll back. Old hashed assets were retained, so rollback does not require deleting the new assets.

The isolated release source and checksums remain at `/home/u512373751/domains/peoplescoopdtr.online/.payroll-pdf-repair-20261014`. The repair was deployed directly and was not committed or pushed as part of this request. Local PDF and month-link fixes already existed among the checkout's unrelated uncommitted work; new coverage is in `PayslipPdfRenderingTest`.

Batch #1 was created during the preceding user-authorized save test. It remains a production draft. Its payroll figures still require business review before finalization; this PDF repair does not certify those figures or deploy the newer office-payroll workflow.
