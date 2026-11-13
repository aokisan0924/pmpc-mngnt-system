# Payroll step 3: type pesos and totals, with visible adjustments (design)

Size: a small project. Agreed with Kurt on 2026-11-13 ("goods, proceed with building").

## Why
HR sometimes agrees a different amount with an employee. On step 3, Kurt and Katherine (the existing payroll users) must be able to type **Overtime pay, Holiday work pay, Gross pay and Net pay** in pesos, and the payroll, Excel and voucher must still add up.

## Decided by Kurt
- Those four can be typed over, for this payroll only.
- When a typed total doesn't match, the system adds a visible **Adjustment** line.
- Only Kurt and Katherine (payroll access as today).

## Proposals accepted ("goods")
1. Overtime pay and Holiday work pay typed in pesos replace the system's amount (blue, ↺ undo). Gross adds them up; no adjustment.
2. Gross typed → **Adjustment (earnings)** = typed gross − computed gross. Example: 9,000 → typed 9,500 = +500.
3. Net typed → **Adjustment (deductions)** = (final gross − typed net) − computed deductions; it can be negative. If both are typed, earnings first, then deductions.
4. Adjustments show on step 3, the payslip and the Excel.
5. An optional note per employee explains the adjustment ("agreed with employee").

## Claude's calls
- Overtime pay is typed as two amounts, **weekday OT pay** and **rest-day OT pay**, because the Excel's overtime tables list them separately.
- Override keys added: `weekday_ot_pay`, `weekend_ot_pay`, `worked_holiday_pay`, `gross_pay`, `net_pay`. New saved columns: `earnings_adjustment`, `deductions_adjustment` (decimal, default 0) and `adjustment_note` (string, nullable).
- Excel: an **ADJUSTMENT** column right before GROSS PAY in both payroll grids, and one right after ELECTRICITY in all four deduction-style tables (the source tables show the cutoff amount, not × 2). Voucher: the earnings adjustment is inside gross (Salaries and Wages); the deductions adjustment goes to the "Savings Deposit / Advances / Other Income" credit line (row 25).
- Typed gross/net are inputs like every override: the server recomputes everything and saves the adjustments. The screen math mirrors it exactly.
- Negative results are allowed for adjustments only; typed amounts are ≥ 0.

## Not doing
- Typing Position (it comes from the employee record).
- Typing the Deductions total (Net covers it).
