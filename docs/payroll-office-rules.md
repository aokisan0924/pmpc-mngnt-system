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

## Policy confirmation status

This document records current preparation behavior and workbook references. It is not independent legal or payroll-policy approval. HR/payroll owners should confirm the office-day defaults, the use of DTR as a reference rather than an automatic pay deduction, and the editable deduction suggestions before any payout formula is changed.

The project rules specify 13th-month pay as daily rate × weighted DTR days present in the tranche ÷ 12. The current employee record has one daily rate and no effective-dated rate history; 13th-month drafts therefore snapshot the database rate at save time. Confirm that basis for employees whose rate changed during a tranche before adopting any historical-rate calculation.

When the weighted DTR days differ from the reviewed paid-day basis after absences, the payroll form requires an explanation and stores both the DTR snapshot and note. This records the review; it does not change the office pay calculation.

## Holidays

Record holidays under **Settings → Holidays** as regular, special non-working, or announced (proclaimed). The calendar is a reference: DTR shows those days as holidays instead of absences, and the payroll form lists the holidays in each cutoff.

Payroll keeps the workbook formula. Holiday pay is not calculated; staff enter it as a verified peso amount per employee, and it is added to gross pay. Absence days are never pre-filled from holidays.

Employees flagged **Always present Monday–Friday** count every weekday (holidays included) as present and on time without punches. This feeds DTR reference days and 13th-month attendance.

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

The office sheets keep the original formatting, row and column sizes, merges and logos (handwritten signature pictures from the original are not part of the template). Names follow each original sheet's style and are sorted by last name; an employee without pay in a saved cutoff appears with zeros. The journal entry beside each office payroll (Salaries and Wages, payables, Cash in Bank, and the employer contribution block where the original has one) is filled from the month's saved figures. The employer share is shown equal to the employee contributions, as in the original workbook. Status notes and the supplemental detail sit from row 88 down, outside the print area.

Every employee must upload a picture of their signature during account setup; the setup cannot be submitted without one, employees can replace but not delete it, and anyone missing one sees a reminder. PNG/JPEG uploads are validated, decoded and stored as private PNG files; super administrators can also upload, preview, replace or remove them from the employee profile. Select first- and second-cutoff Prepared by, Certified Correct and Approved by employees on the saved payroll page. Any active employee can be selected; each selection prints only that employee's name in the office payroll, overtime and voucher sign-off areas. **Signature pictures are never added to the Excel export.**

The supplemental detail shows paid-day basis, allowances, overtime, savings, other deductions, tardiness and cash advances without fitting them into an incorrectly labeled original column. The PHP GD extension is needed for signature uploads; DOM and Zip are needed for Excel export.

The voucher uses the original layout, cooperative header, account names and account codes. Credits reconcile saved net pay and every deduction to saved gross pay, so debits equal credits. The system stores one loan amount, so the full loan deduction appears under Loans Receivable and **Interest Income from Loan is left blank for a manual split**. Other deductions, tardiness and cash advances share the Employees' Benefit line, relabeled Other Income / Advances when any are present. Payee, voucher number and date posted are typed in after download.

The sanitized deployment asset is `resources/payroll/management-template.xlsx`; it contains no previous employee payroll data or formulas. Do not deploy the original filled workbook as a public asset. The supplied template supports 3 Main Office, 2 Fort Magsaysay, 2 General Merchandise and 4 Cubao employee rows per month. Export rejects excess employees, duplicate cutoff batches and historical items without an office, rather than silently omitting or guessing rows. An approved expanded template and matching layout configuration are needed when the roster grows.
