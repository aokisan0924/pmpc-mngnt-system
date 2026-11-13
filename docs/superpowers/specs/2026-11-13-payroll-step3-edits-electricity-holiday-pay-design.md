# Payroll step 3: electricity, editing any number, holiday pay for work done (design)

Size: a project. Agreed with Kurt on 2026-11-13.

## Why

HR (Kurt and Katherine) builds each cutoff in the payroll wizard and sends the management Excel. On step 3 ("OT & allowances") they need to:

1. deduct an **electricity bill** from some employees, typed every cutoff, because the bill changes every month;
2. **change any number by hand** when the system's number is wrong for this cutoff, without changing the employee's record;
3. **pay people who worked on a holiday** the DOLE extra, worked out automatically.

Success: the Excel and voucher still balance, HR can see what was changed by hand, and holiday pay matches DOLE without HR doing the math.

## Goals

### 1. Electricity deduction
- A new **Electricity** amount per employee on step 3. It starts at **0** every cutoff and is typed by HR. It is never saved to the employee record.
- It counts in the employee's deductions and lowers net pay.
- **Excel:** a new **ELECTRICITY** column right after **RENTAL PAYMENT** in the deductions table, in both cutoffs' deduction tables, on all four office sheets. Totals include it.
- **Voucher:** electricity is **added into the existing Rent Income line** (`D23`/`I23`). The voucher layout does not change.

### 2. Change any number on step 3
- Editable (typed over the system's number): **days of work, basic pay, NPW-Holiday, SSS, PhilHealth, Pag-IBIG, W/H tax, loan, CC, cash advance, absent, late, rental, electricity**, plus the allowances and overtime that are already editable.
- The system still works out its own number first. A typed number **replaces** it for this payroll only.
- A replaced number is shown in a **different colour** with a small **undo** that brings back the system's number.
- **Gross, total deductions and net pay are never typed.** They always add up from the cells.
- Typed numbers are saved with the payroll item. The employee record is unchanged, so the next cutoff starts from the system's numbers.
- The Excel and voucher use the typed numbers, and every row and journal still balances.

### 3. Holiday pay for work done (DOLE)
- Rates follow DOLE. The hourly rate is **daily rate ÷ that person's shift hours**: ÷ 8 for office staff, ÷ 12 for the 12-hour merchandise/store shift (₱600 → ₱50).
- "Rest day" means the date is not one of that person's work days (`Employee::isWorkDay`).

| Holiday type | Normal work day: first 8 h / each hour after 8 | Rest day: first 8 h / each hour after 8 |
|---|---|---|
| Special non-working | hourly × 130% / hourly × 130% × 130% | hourly × 150% / hourly × 150% × 130% |
| Announced (proclaimed) | same as special | same as special |
| Regular | hourly × 200% / hourly × 200% × 130% | hourly × 260% / hourly × 260% × 130% |

- **What is added:** the DOLE total for the hours worked, **minus the pay already counted for that day**. Pay already counted = hourly × the day's paid hours in the payroll's attendance (the `worked_hours` the DTR calculator gives that day).
  - A person whose holiday was cut as no work, no pay (paid 0) gets the full DOLE amount added. Their NPW-Holiday deduction stays.
  - A person already paid for the day (an office worker who clocked in, or merchandise staff paid a fixed half month) gets only the difference. Example: merchandise worker, ₱600/day, 12 h on Nov 2 (a normal work day for them): DOLE total = 50 × (8 × 1.30 + 4 × 1.30 × 1.30) = ₱858; already paid 12 × ₱50 = ₱600; **added ₱258**.
- **Hours:**
  - Clocked in on the holiday: hours come from the **DTR** automatically. Nothing to type.
  - Worked but didn't clock in: HR types the hours **for each holiday date separately** (a cutoff can have two holidays with different rates).
- The amount is shown on step 3 per employee and goes into **Overtime pay** on the Excel, where the typed holiday premium already goes.
- The existing typed **"Holiday premium ₱"** box stays for anything special.

## Non-goals
- Electricity on the employee record or an automatic monthly bill.
- Changing how unworked regular holidays are treated (today every holiday not worked is no work, no pay). Out of scope; noted for Kurt.
- Changing how lates are charged (still daily rate ÷ 8 ÷ 60 per minute).
- Typing gross, total deductions or net pay.

## Anti-goals (a failure even if it works)
- An Excel or voucher that no longer balances.
- A holiday paid twice (100% base + 130% added).
- A hand-typed number that nobody can see was typed.
- Screen and saved numbers disagreeing. The screen math (`resources/js/Pages/Admin/officePayrollMath.js`) and the server (`OfficePayrollCalculator`) must give the same result for every case.

## Constraints
- Server rule stays: money is recomputed on the server from the saved inputs; the browser's totals are never trusted. A typed number is an **input** the server applies, then it recomputes gross/net.
- Finalized payrolls cannot change.
- A database migration is needed for the new saved values, so take a backup before deploying it (AGENTS.md §7).
- The template is changed with `scripts/build-payroll-template.py` (a function applied to the current template, like `reorder_signoffs`), keeping logos and print areas.
- Log the change in `CHANGELOG.md` and the deploy in `DEPLOYMENTS.md`.

## Approaches

**Changing any number** (chosen: 1)
1. **Keep both numbers.** The server computes its number, then applies a saved typed value on top, and remembers the original so it can be shown and undone. Totals always add up. *Chosen.*
2. Plain typed boxes with no checking. Simpler, but one typo breaks the Excel balance and nobody can tell what was changed.
3. Edit the employee record. Rejected: it would change every future payroll.

**Holiday pay** (chosen: 1)
1. **Automatic from the DTR, typed only when there are no punches.** *Chosen.*
2. Always typed by HR. More work and easy to miss someone.

## Calls made after the builder check (Claude's calls; Kurt to check)
- **Holiday hours from the DTR** are the day's real `hours_rendered` (punched time, lunch excluded as the DTR already does), not the payroll's capped `worked_hours`. A day still missing a punch uses what step 2 decided (typed hours, or 0). "Pay already counted" still uses the payroll's `worked_hours` for that day.
- **Typed hours** are only for holiday dates with no punches. They never replace real DTR hours.
- **No holiday extra on assumed days** in a mockup, and none on a date with no `Holiday` row.
- **Each typed number stands alone.** Typing basic pay, days of work, NPW-Holiday or absent changes only that cell; the others keep the system's numbers. Gross = basic pay + overtime (incl. holiday extra and premium) + allowances − NPW-Holiday − absent, as on the sheet today, so the Excel and voucher still balance.
- **A typed number stays** when the DTR later changes. The system's new number shows faded next to it, and undo brings it in.
- The holiday extra is shown **on its own line** in the "Overtime & holiday pay" panel next to the typed "Holiday premium ₱" box, so HR can see both and avoid paying twice.
- Late typed by hand replaces the late amount; the minutes stay as recorded.

## Kurt's answer after the builder check
- **SSS, PhilHealth and Pag-IBIG on the 2nd cutoff** start at **0** as now. If HR types an amount, **it is deducted**. The typed value wins over the 2nd-cutoff rule.

## Left to the builder
- How typed values are stored (for example a JSON `overrides` map and a JSON per-date `holiday_hours` map on `payroll_items`, plus an `electricity_deduction` column and a `worked_holiday_pay` column).
- How "Absent" maps onto the saved fields (`absence_deduction` includes NWNP; the Excel ABSENT column is absence − NWNP).
- Where the per-date holiday-hours input sits on step 3. Suggestion: the "Overtime & holiday pay" panel at the top.
- How the step 4 "who changed" check and the mockup export treat typed values.
