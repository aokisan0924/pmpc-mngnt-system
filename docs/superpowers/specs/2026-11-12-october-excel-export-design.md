# Management Excel export in the October 2026 layout

Date: 2026-11-12 · Owner request: "Match October layout" (the workbook HR actually used for October 2026).

## Why

`App\Services\ManagementPayrollExport` fills `resources/payroll/management-template.xlsx`, which is the
September 2026 layout. HR's October 2026 workbook is newer and is what they print and sign: it adds an
NPW-HOLIDAY column, ABSENT and TARDINESS columns inside the deduction tables, and two "GOVT & OTHER
DEDUCTIONS" source tables per sheet. The export must produce that October layout from saved payroll data.

Source workbook (real salary data, never commit it): `C:\Users\Kurtong\Downloads\OCTOBER  2026 MANAGEMENT PAYROLL.xlsx`
(two spaces after OCTOBER). Sheets: MAIN OFFICE, FORT MAGSAYSAY, GEN MDSE, CUBAO SATELLITE OFFICE,
OCTOBER 2026 VOUCHER.

## Template

Build a new `resources/payroll/management-template.xlsx` from the October workbook with a committed,
repeatable script (`scripts/build-payroll-template.py`, openpyxl, reads the source path from argv):

- Keep all labels, header rows (rows 1–10), styles, column widths, merged cells, print areas.
- Remove every formula and every employee value: names, positions, amounts, hours, the static
  signatory names, voucher amounts, voucher number and date. No real names or amounts may remain
  (the existing test `test_template_contains_no_previous_payroll_or_formulas` must keep passing;
  extend its blacklist with CONDO, LUCERO, MALANA, FERIA, SEVILLENO, Reynold, 12683).
- Give every office sheet 6 employee rows (rows 11–16) so live staffing fits (Main Office has 4 today).
  Insert the missing rows before the TOTAL row and shift everything below (TOTAL row, sign-off,
  overtime tables, journal, merged ranges, print areas) consistently.
- Mark the cells the export must find, so code does not hard-code letters: put the literal markers
  `{{prepared}}`, `{{certified}}`, `{{approved}}` where the October signatory names were (both the
  payroll sign-off block and the overtime sign-off block, both cutoffs), and leave all header texts
  exactly as in October.

## Export: find columns by header text

Row 10 of each office sheet holds the headers. A block starts at each `EMPLOYEE NAME`. Blocks, in order:
1. 1st-cutoff payroll grid, 2. 2nd-cutoff payroll grid, 3. "1ST - 15TH GOVT & OTHER DEDUCTIONS" source
table, 4. "1ST - 15TH DEDUCTIONS", 5. "16TH - 30TH DEDUCTIONS", 6. "16TH - 30TH GOVT & OTHER
DEDUCTIONS" source table. Column order differs per sheet (e.g. Fort Magsaysay 2nd grid is TRANSPO,
QUART, REP; Gen Mdse 1st grid has ABSENT and no allowances; Cubao has SAVINGS; RENTAL is called
"RENTAL PAYMENT" or "RENTAL INCOME"); always look columns up by header text.

The TOTAL row is the row whose column B says TOTAL. Overtime tables: the row containing
"OVERTIME PAY" / "1.3% OVERTIME" titles; headers on the next row; one row per employee after that.
Journal: label cells in column O (M on GEN MDSE) from "Salaries and Wages" down; debit is two columns
right of the label, credit three columns right.

## Values (one row per employee per cutoff, from saved `payroll_items`, never recomputed)

Payroll grid:
- EMPLOYEE NAME: existing `sheetName()`; POSITION: upper-case position.
- DAYS OF WORK: `days_present` (days actually paid, as October does: 10 when one day was absent).
- BASIC PAY: `basic_before_absence`.
- OVERTIME PAY: `total_ot_pay + holiday_pay` (the typed holiday premium has no column of its own; the
  supplemental detail block lists it separately).
- TRANSPO / REP / QUART ALLOW: `cutoff_transpo`, `cutoff_rep`, `cutoff_quarterly`.
- NPW- HOLIDAY (only where the grid has it): `nwnp_deduction`.
- ABSENT (only Gen Mdse 1st grid): `absence_deduction − (NPW column used ? nwnp_deduction : 0)`.
- GROSS PAY: BASIC + OVERTIME + allowances − whatever this grid shows in NPW-HOLIDAY / ABSENT.
- DEDUCTIONS: `total_deductions` + the absence amount shown in the deduction table (see below).
- NET PAY: `net_pay`. Invariant per row: GROSS − DEDUCTIONS = NET, to the centavo. Assert it in code
  (reject the export with a clear message if a saved item breaks it).

Per-cutoff deduction tables (blocks 4 and 5), pesos:
W/H TAX `tax_deduction`, SSS, PHILHEALTH, PAGIBIG, LOAN `loan_deduction`, CC
`capital_contribution_deduction`, SAVINGS `savings_deduction`, CASH ADVANCE `cash_advance_deduction`,
RENTAL PAYMENT/INCOME `rental_deduction`, TARDINESS `tardiness_deduction` (0 for hours-based batches),
ABSENT = the part of `absence_deduction` not already shown in the grid's NPW-HOLIDAY / ABSENT column,
TOTAL DEDUCTIONS = the grid DEDUCTIONS value. `other_deductions` has no column: it is in TOTAL and in
the supplemental detail block.

GOVT & OTHER DEDUCTIONS source tables (blocks 3 and 6, one per cutoff): monthly figures as HR types
them: W/H TAX = `tax_deduction × 2`; SSS/PHILHEALTH/PAGIBIG = that cutoff's amounts; LOAN, CC,
SAVINGS, CASH ADVANCE, RENTAL = that cutoff's amount × 2; ABSENT = `absence_days` (days);
TARDINESS = `tardiness_minutes` (minutes); TOTAL DEDUCTIONS = sum of the peso columns only.

TOTAL rows: sum every numeric column of every block (days and minutes columns too).

Overtime tables: per cutoff, 125% table = name, `weekday_ot_hours`, `weekday_ot_pay`; 1.3% table =
name, `weekend_ot_hours`, `weekend_ot_pay`.

Sign-off: replace the markers with the chosen signatory's full name (same signatory selection as
today, per cutoff); blank when unsigned.

Journal per sheet (month total of both cutoffs, label → value): Salaries and Wages (debit) = sum of
the grids' GROSS PAY; credits: Wholding Tax Payable = tax; SSS / Phil Health / PAGIBIG; Loans
Receivable = loan; Interest income from Loans = 0; Share Capital = CC; Rental Income = rental;
Tardiness/Absent = sum of deduction-table ABSENT + TARDINESS; Savings Deposit = savings; Cash
Advance / Advances To Officers = cash advance; Employees' Benefit = 0; Other Income = other_deductions;
Cash in Bank = net. Debit total must equal credit total. Where the sheet has the employer block
("SSS, PhilHealth. Pagibig Contr…" with the three "- Employer" rows) fill it as today: debit = sum of
the three, credits each.

Voucher sheet (rename to "<MONTH YEAR> VOUCHER"): I12 = last day of the month (n/j/Y), B15 and C34 the
same date; H15 = all offices' Salaries and Wages; credits I16 tax, I17 SSS, I18 PhilHealth, I19
Pag-IBIG, I20 share capital (CC), I21 loans, I22 interest 0, I23 rent, I24 tardiness/absent, I25
savings, I26 employees' benefit 0, I27 cash in bank (net); H28/I28 totals; signatories row 31: C31
prepared, D31 certified, H31 approved, upper-case. Leave voucher number blank.

Unchanged behaviour to keep: one batch per cutoff per month, missing 2nd cutoff shows
"CUTOFF NOT AVAILABLE", office capacity check (now 6 per sheet), signatory validation, the
supplemental detail block below the print area, file name, deleting the temp file after download.

## Out of scope

Payroll math, the wizard, saved data. Only the template and `ManagementPayrollExport`.
