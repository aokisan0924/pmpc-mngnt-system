# Notify employees when an admin assigns them a task (design)

Date: 2026-11-04. Status: awaiting approval. Size: small change (backend plus one display case).

## Intent
Admins assign tasks from Team tasks, but employees only find out by opening My tasks. Tell them when it happens, using the notification
system that already exists (bell, popup, Notifications page).

## Goals
- When an admin **creates** a task for an employee, that employee gets a notification.
- When an admin **creates a whole-office task**, every active employee in that office gets one.
- When an admin **reassigns** a task to a different employee, the new owner gets one.
- The notification shows what and when: title "New task assigned", message with the task title and due date, linking to My tasks.
- The Notifications page shows these with a "Task" badge instead of the generic "Notice".

## Non-goals
- No notification for edits, status moves, deletes or comments, and none sent to admins.
- No email or phone push. The existing in-app and real-time popup path is used as is.
- No per-user settings to turn it off.
- Employees' own personal tasks never notify anyone.

## Anti-goals
- Never notify the admin who made the change, even when they assign a task to themselves or to their own office.
- Never notify inactive employees, or employees outside the task's office.
- A notification failure must not stop the task from being saved.

## Design
- In `TeamTaskController::store` and `update`, after saving, call the existing `EmployeeNotification::send(employeeId, type 'task_assigned', title,
  message, link '/employee/planner')` for each recipient:
  - named employee task: that employee (skip the acting admin);
  - whole-office task: active employees whose `payroll_office` matches the task's office (skip the acting admin).
  On update, notify only when `employee_id` changed to a different employee (or an office-wide task was turned into a personal one for someone new).
- Message format: `<task title> · due <Nov 6, 2026>`; the assigning admin's name is added when known ("Assigned by Kurt Vincent").
- `Employee/Notifications.jsx`: add a `task_assigned` case ("Task" badge). The Approved/Declined filters are unchanged.
- Tests: assignment notifies the employee; office-wide task notifies only active members of that office and not the admin; reassigning
  notifies the new owner only; editing without reassigning sends nothing; self-assignment sends nothing.

## Calls made (change any of these)
- Office-wide tasks notify everyone in the office, even if that is several people at once.
- Reassignment notifies only the new owner; the previous owner is not told.
- The popup uses the existing real-time channel; if it is unavailable the notification still appears in the bell and the page.
