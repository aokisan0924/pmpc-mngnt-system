---
name: pmpc-hris-payroll-engine
description: >-
  Use this skill whenever working on Daily Time Record (DTR) punches, attendance calculations,
  semi-monthly payroll, overtime computations, 13th month pay, or statutory deductions in PMPC WorkForce.
---

# PMPC WorkForce Domain Rules & Calculations

This skill specifies the business rules, legal compliance, and domain calculation standards for People's Multi-Purpose Cooperative (PMPC) HRIS.

## 1. Daily Time Record (DTR) State Machine

- **Four Sequential Punch Slots**:
  1. `am_in` (Morning clock-in)
  2. `am_out` (Morning clock-out / lunch start)
  3. `pm_in` (Afternoon clock-in / lunch end)
  4. `pm_out` (Evening clock-out)
- **Sequential Locking**:
  - The UI and backend must only allow the immediate next punch in sequence. Once punched, a slot is locked unless an official edit request is approved.
- **Attendance Status Rules**:
  - `on_time`: Clocked in on or before the shift start time + late grace period (configured in settings).
  - `late`: Clocked in after the shift start + grace period.
  - `undertime`: Clocked out before the scheduled shift end.
  - `half_day`: Only completed half of the daily shift (either AM or PM).
  - `absent`: No valid punches recorded on a scheduled workday without an approved leave.
- **Edit Requests**:
  - Employees can submit punch correction requests only within a 7-day window.
  - Submitting an edit request alerts HR admins. Upon admin approval or decline, a real-time notification is broadcasted via Pusher to the employee.

## 2. Semi-Monthly Payroll Cutoffs

Payroll is run twice per month with distinct statutory contribution handling:
- **1st Cutoff (1st to 15th)**:
  - Base salary: Days present in period × `daily_rate`.
  - Full statutory deductions deducted here: SSS, PhilHealth, Pag-IBIG contributions.
  - Regular loan deductions and withholding tax.
- **2nd Cutoff (16th to End-of-Month)**:
  - Base salary: Days present in period × `daily_rate`.
  - Statutory contributions (SSS, PhilHealth, Pag-IBIG) are **waived** (since already deducted in 1st cutoff).
  - Split recurring deductions and cash advances continue.

## 3. Overtime & Rates Calculation

- **Standard Working Hours**: 8 hours per day.
- **Hourly Rate Calculation**:
  $$\text{Hourly Rate} = \frac{\text{Daily Rate}}{8}$$
- **Overtime Multipliers**:
  - **Weekday Overtime**: $125\%$ ($1.25 \times \text{Hourly Rate} \times \text{Hours}$)
  - **Weekend / Rest-Day Overtime**: $130\%$ ($1.30 \times \text{Hourly Rate} \times \text{Hours}$)
- **Allowances**:
  - Transportation, representation, and other regular allowances must be prorated or applied according to the employee's compensation profile.

## 4. 13th Month Pay (RA 6686 / PD 851)

- **Computation Formula**:
  $$\text{13th Month Pay} = \frac{\text{Daily Rate} \times \text{Total DTR Days Present in Period}}{12}$$
  - Fully pro-rated on actual attendance, never on assumed working days.
- **Tranches**:
  - Mid-Year Tranche: Period January 1 to June 30 (released in June).
  - Year-End Tranche: Period July 1 to December 31 (released in December).

## 5. Audit Trail & Finalization Immutability

- **Draft vs Finalized**:
  - Payroll batches start in `draft` state allowing recalculation, overtime adjustments, and dispute resolution.
  - Once marked `finalized`, the batch is strictly **immutable**. No edit, recalculate, or delete operations are permitted.
  - Payslips generated from finalized batches must match stored snapshot figures.
