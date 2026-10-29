# DTR Fed Payroll Design

## Goal

Use DTR attendance as the default source for payroll workdays, absences, and tardiness while allowing a super admin to correct mistakes before saving a draft.

## Approved Behavior

- Payroll preview calculates attendance for the payroll cutoff from DTR status, punch times, employee schedules, the configured late grace period, and existing automatic-presence rules.
- The existing workbook payroll calculation remains: daily rate multiplied by workdays less absences, plus existing allowance and overtime calculations, less deductions. DTR supplies the attendance inputs; overtime and holiday pay remain separately entered payroll values.
- The super admin may override the payroll days-work basis, DTR-derived absences, and late minutes in the preview. Require an explanation when those values differ from their DTR or workbook defaults.
- Save DTR-derived attendance values, the workbook days-work default, and the values used for payroll on each payroll item. Show the DTR baseline and override explanation on the saved payroll.
- Flag incomplete DTR days. A super admin may proceed with an explanation for the affected employee; without an explanation, finalization is blocked.
- Never change existing or finalized payroll rows.

## Calculation Rules

- Preserve the current office paid-days basis and custom-schedule basis from the payroll workflow.
- DTR present-day weighting stays consistent with the application: full-day `on_time`, `late`, and `undertime` count as 1; `half_day` counts as 0.5; absent and missing-out count as 0 pending correction.
- DTR-derived absences come from scheduled DTR statuses: `absent` and `missing_out` count as 1; `half_day` counts as 0.5. Holidays, rest days, and not-started days do not become absences. The saved absence value is capped at the payroll paid-days basis.
- For a late DTR with an applicable clock-in, calculate late minutes after the configured grace period and the shift start in effect on that date. An afternoon-only half day is not charged as late against the morning shift.
- A past DTR marked `missing_out`, or a cutoff containing future or in-progress workdays, is surfaced as unresolved. An override reason documents the super admin's decision to proceed.

## Scope

Update the DTR payroll attendance calculation, payroll preview and validation, payroll item snapshot schema, saved payroll display, and `CHANGELOG.md`. No production deployment or live payroll changes are included.
