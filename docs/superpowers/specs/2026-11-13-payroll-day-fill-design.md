# Payroll day: fill in the rest of the day (design)

Size: a small change. Agreed with Kurt on 2026-11-13.

## Why

Company rule: on payroll day, anyone who has timed in, or who times in later that day, is present for the whole day, because the payroll is given that same day. The payroll already pays them that way (commit `026e02e`). This button makes the **DTR record look complete** too.

## What it does

- **Who can press it:** the admin and Katherine (anyone with `canProcessPayroll()`).
- **When:** payroll is always given on the last weekday on or before the 15th (or before the month's end). The button works only when today is that cutoff's end date.
- **Pressing it:**
  1. Remembers that today is payroll day.
  2. For everyone who has already timed in today, fills in the punches that are still empty:
     - office staff: the normal times, 12:00 out, 1:00 in and 5:00 out;
     - store staff (two-punch shifts): their own clock-out time from their schedule, e.g. 6:00 PM.
- **Later time-ins:** once today is payroll day, anyone who times in later gets the rest of their day filled in right away, at that time-in.
- **Filled times stay.** The day shows as complete, so the employee cannot punch again that day. Mistakes are fixed with the existing DTR correction.
- The real time-in is never changed, so a late arrival stays late.

## Not doing

- Paying days after payroll day in advance. Weekends after payroll day are not counted, as now.
- Filling anyone who has not timed in.
- Any undo button. The existing DTR correction covers it.

## Approaches

1. **The button turns on "payroll day" for today** (chosen). Press once: it fills everyone already timed in and marks today as payroll day, so later time-ins fill in automatically. Nothing happens until someone presses it.
2. Every time-in on the cutoff's last day fills in automatically, with no switch. Rejected: if nobody means it to be payroll day, it still fills.
3. A job checks every few minutes. Rejected: slower and does the same thing as 1.

## Builder's calls (Kurt, check these)

- The button sits on the payroll wizard's **DTR check** step (step 2). After it is pressed, the step reloads and shows the newly complete days.
- "Payroll day" is stored as today's date in `settings` (for example `payroll_day = 2026-11-13`), so it ends on its own at midnight.
- The filling reuses the schedule's times (`EmployeeSchedule::shiftFor`) and `DtrLog::computeHoursAndStatus()`, like `AlwaysPresentAttendanceFiller` does. It never overwrites a punch that is already there.
- Someone whose first punch today is after lunch (afternoon half day) gets only the 5:00 out filled. The morning stays empty, because nobody saw them then. The payroll still pays the whole day.
- A person on an absence notice today, or on a holiday not worked, is left alone.
- Pressing the button is normal work inside the app, so it is not logged in `DEPLOYMENTS.md`.
