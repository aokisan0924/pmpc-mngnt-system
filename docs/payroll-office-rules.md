# Office payroll preparation

Reference: `SEPTEMBER 2026 MANAGEMENT PAYROLL.xlsx`, supplied by management. This is an operational reference, not independent verification of tax or labor compliance.

## Confirmed pay basis

| Office | Default paid days per cutoff | Reference |
| --- | --- | --- |
| Main Office | 11 | MAIN OFFICE!E11:E12, R11:R12 |
| Fort Magsaysay | 11 | FORT MAGSAYSAY!E11:E12, R11:R12 |
| General Merchandise | 15 | GEN MDSE!D11:E12, N11:O12 |
| Cubao Satellite Office | 11 | CUBAO SATELLITE OFFICE!E11:E12, R11:R12 |

Basic pay is daily rate × (paid days before absences − verified absence days). The office sets a default, not a mandatory attendance count. Staff can enter exceptions in half-day increments, including the two-day Cubao cases in E13:E14. Enter zero paid days for an unpaid row. Review any fixed allowances separately in the employee compensation profile.

Missing DTR entries are not treated as absences. Recorded DTR days appear only as a reference. Do not subtract an absence twice by reducing paid days and also entering that same absence in the absence field.

Monthly transportation, representation, and quarterly allowance profile amounts are halved for each cutoff, following the workbook. Weekday overtime uses daily rate ÷ 8 × 125% × hours; rest-day overtime uses 130%. All new monetary components are rounded to peso cents before totals, matching stored column precision. Historical workbook fractions of a cent are not retained in new amounts.

## Deductions require review

The workbook does not establish one reliable deduction schedule for every office. Some formulas differ between first and second cutoffs, some labels point at different deduction columns, and some references are broken. The application does not copy those formulas or infer a person's office from their name or department.

The preparation form suggests full SSS, PhilHealth, and Pag-IBIG on the first cutoff and zero on the second; withholding tax and other monthly profile deductions are suggested at half per cutoff. These are editable suggestions, not confirmed office policies. Payroll staff must enter the verified amounts for the selected cutoff, including loans, capital contribution, savings, rentals, cash advances, and other deductions. An odd cent in a monthly amount may require adjusting one cutoff so both cutoffs reconcile to the monthly amount.

Enter tardiness as a verified peso amount. The workbook uses inconsistent daily rates in tardiness formulas, so WorkForce does not infer a rate or calculate a deduction from minutes.

## Preparing and saving

1. Confirm the employee profile's daily rate and allowances.
2. Select each employee's payroll office and check the default paid days.
3. Enter verified absences, any individual paid-day exception, overtime, and tardiness.
4. Review every deduction against office payroll records for this cutoff.
5. Confirm the employee review checkbox. Changing an input clears that review.
6. Save the draft batch. Preview totals and saved amounts use the same component rounding.

The server validates the inputs, rejects unknown offices, excess absences, unreviewed rows, duplicate employees, and inactive/non-staff employees, and calculates earnings itself. A change to rates or allowances after preview requires a reload and review. Batch creation remains transactional. Finalized batches retain the existing edit/delete restrictions.

## Historical payroll and rollout

Existing payroll records are not recalculated or backfilled. Office, paid-day basis, absence days, and tardiness are stored for newly prepared batches. Existing records have no office basis. The additive migration is `2026_10_01_000001_add_office_basis_to_payroll_items.php`; deploy it together with the updated preparation form and backend. The supplied workbook is not modified, and employee rates or identities are not imported automatically.

September workbook issues remain separate: 27 cached `#REF!` cells and a cached voucher debit/credit difference of ₱57.50. The initial office payroll example tests are not proof that the complete September voucher reconciles.

## Excel management export

Use **Export Management Excel** on a saved payroll batch. It downloads the selected calendar month with all available saved cutoffs, using the supplied September workbook's four office sheets, columns, branding, merged headings and approval areas. Unavailable cutoff sections remain blank and are explicitly labeled. Draft/finalized status appears in each cutoff heading. Amounts come from saved payroll items, never current compensation profiles; current employee names and positions identify the rows.

The original **BASIC PAY** and **ABSENT** headings are preserved. Where an absence column exists, export displays basic pay before absences and the monetary absence reduction; saved gross/net amounts are unchanged. New items store both amounts. Older items with some worked days can reconstruct them from saved basic pay and day inputs; an older all-absent item without these snapshots blocks export. Main Office's second-cutoff section has no absence column, so its basic-pay amount remains net of absences and the day inputs appear in supplemental detail.

Upload a signature through the employee profile's **Signature for payroll sign-off** section. PNG/JPEG uploads are validated, decoded and stored as private PNG files; only super administrators can upload, preview, replace or remove them. Select first- and second-cutoff Prepared by, Certified Correct and Approved by employees on the saved payroll page. Each selection prints that employee's name and signature in the office payroll and overtime sign-off areas. The selected batch's cutoff signatories also appear on the voucher. Leave selections unsigned to omit images. These are selected signature images, not a new electronic approval transaction, and are never printed beside payroll rows.

The supplemental detail shows paid-day basis, allowances, overtime, savings, other deductions, tardiness and cash advances without fitting them into an incorrectly labeled original column. The PHP GD extension is needed for signature image decoding, alongside DOM and Zip for Excel export.

The voucher uses the original layout as a **payroll reconciliation for accounting review**, not an automatically posted accounting voucher. Loan principal versus interest and other ledger allocations are not available in this system; no allocation or account code is invented. Credits reconcile saved net pay and every deduction to saved gross pay. Missing cutoffs produce a partial-month label.

The sanitized deployment asset is `resources/payroll/management-template.xlsx`; it contains no previous employee payroll data or formulas. Do not deploy the original filled workbook as a public asset. The supplied template supports 3 Main Office, 2 Fort Magsaysay, 2 General Merchandise and 4 Cubao employee rows per month. Export rejects excess employees, duplicate cutoff batches and historical items without an office, rather than silently omitting or guessing rows. An approved expanded template and matching layout configuration are needed when the roster grows.
