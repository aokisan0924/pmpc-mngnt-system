# Account setup and employee payslip release

Employees keep their existing account, password, employee ID, DTR history and payroll links. The first login for staff without approved setup opens `/employee/setup`; attendance remains available through normal navigation. Subsequent pending submissions show a status notice rather than forcing another submission.

Required confirmation: first/last name, email, contact number, one of the three payroll offices, and review of the existing employment record. Middle name, suffix, address, employment corrections, government IDs and signature uploads are optional. Setup never updates compensation, permissions or employment status.

Super administrators review pending submissions at `/admin/account-setups`. Approval applies proposed identity/contact details and records the verified office, reviewer and timestamp in one transaction. Returning a submission requires a correction note; the employee can submit again. Approved setup cannot be resubmitted by an employee. HR maintains later names through the employee profile and records office transfers with a required reason. Existing payroll office snapshots are preserved.

New payroll previews automatically use verified employee offices and the associated paid-day defaults. Unverified employees stay visible and prevent saving the batch. The server rechecks the office against the locked employee record when saving, so a stale or edited client office cannot bypass verification.

Employee payslip history, career totals and PDFs include finalized batches only. A draft-only month is absent and its employee PDF returns 404. Mixed months include only the finalized cutoff until the other cutoff is finalized. Administrator preview PDFs retain draft access through administrator routes.

## Deployment prerequisites

- Back up the production database and private signature storage.
- Deploy the complete source and matching built assets, including the new account setup pages, requests, services, model and routes.
- Run `php artisan migrate --force` using the supported application PHP runtime. The additive account setup migration is `2026_10_02_000002_add_employee_account_setup.php`; earlier office/signature migrations must also be applied.
- Clear/rebuild application caches according to the existing deployment procedure.
- Verify employee setup, HR approval, attendance access, automatic office assignment and draft/finalized payslip behavior on the deployed host before processing real payroll.

Existing employees are deliberately left unverified by the migration. No office is inferred from names, department text, DTR records or an Excel sheet. Payroll cannot be saved until every included employee has a verified office.

## Local verification

Automated feature coverage includes preserved credentials and DTR links, HR authorization, duplicate/rejected submissions, unverified and tampered payroll offices, office-transfer snapshots, private self-service signatures, HR-controlled names, draft-only payslip denial and mixed-cutoff PDF filtering. Migration apply/rollback/reapply was tested on a copy of the September SQLite database with original values preserved. Desktop/mobile browser checks used synthetic accounts in a separate database copy, not real employee accounts.

These checks do not certify the remaining payroll cutoff/duplicate safeguards, Excel office capacities, September financial reconciliation or Hostinger/MySQL deployment readiness.
