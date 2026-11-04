# Office tasks and the Google Tasks import (design)

Date: 2026-11-04. Status: awaiting approval. Size: small-to-medium change. Builds on `2026-11-04-task-board-design.md`.

## Intent
Kurt keeps work lists in Google Tasks (Xander, Reynold, Team Isabela, Team Fortmag, Team Cubao). He wants those 19 tasks in the
app, and wants tasks to belong to an office as well as to a person.

## Goals
- A task can belong to an **office** (Cubao Office, Fort Magsaysay Office, UPI Main Office).
- An office task with no named person is **seen by everyone in that office**. A task that names a member is **seen only by that member**.
- Team tasks (admin) gets an Office filter and shows each card's person or "whole office".
- The 19 tasks are imported as admin-assigned tasks.

## Non-goals
- Renaming the payroll office labels (Cubao Satelite Office, Fort Magsaysay, Main Office stay as they are in payroll and exports).
- Recurring tasks, Google sync, an Offices admin screen. The three offices are fixed in code.

## Anti-goals
- An employee must never see a task for another office or another person.
- Existing tasks, payroll, and DTR must not change.

## Design
- **Offices:** reuse the existing office keys on employees (`cubao`, `fort_magsaysay`, `main_office`). New constant `Task::OFFICES` maps them to
  Cubao Office, Fort Magsaysay Office, UPI Main Office. General Merchandise is not a task office.
- **Data:** migration adds `tasks.office` (nullable string) and makes `tasks.employee_id` nullable (office-wide tasks have no employee).
  A task needs an employee or an office. When an admin picks only an employee, the office is filled from that employee's office.
- **Visibility:** new scope `Task::visibleTo(Employee)`: own tasks, plus tasks with no employee whose office is the employee's office. Used by
  the Planner and the employee dashboard.
- **Employee rights on office-wide tasks:** members of the office can move them between To do / Doing / Done (shared, so one member finishing
  it finishes it for the office). They cannot edit or delete them. Their own and assigned-to-them tasks work as today.
- **Admin:** the Team tasks form gets an Office select and an optional Employee select; Office filter on the board; card shows the person or
  "Whole office: <office>". Admins still only manage admin-created tasks.
- **Import:** a one-off script run on live (dry run, then backup, then apply, then logged in `DEPLOYMENTS.md`), idempotent by title and owner.

## Import mapping (from the screenshots)
- Xander list (5 tasks) to Alexander A. Feria Jr.; Reynold list (4) to Reynold Valdez.
- Team Cubao: "Kath" to Katherine Sevilleno, "Kurt" to Kurt Vincent Fariñas.
- Team Isabela is the UPI Main Office: "New Loans Deposit", "LRV", "Assistance on planning" are office-wide; "Yvon and Jerome" is one task for each of Yvonne N. Condo and Jerome A. Santos.
- Team Fortmag is Fort Magsaysay: "Facebook Page Monitoring", "new loans deposits", "Update LRV" are office-wide; "Validating information on PIS" is one task for each of Diana Pasco and Mariel S. Lucero.
- Result: 21 tasks (two named-pair tasks become two each). Titles and notes are copied exactly as shown.

## Calls made (change any of these)
- Tasks are recorded as assigned by Kurt (admin id 12).
- Tasks with no due date get 2026-11-04 (due date is required today). They will show overdue from tomorrow.
- The original list name is saved as each task's category, so you can tell where it came from.
- Recurring markers are not imported.
- "new loans deposits" (Fortmag) is cut off in the screenshot; I use the same text as the matching Isabela task.
- Named-pair tasks are copied per person so each can finish their own.

## Left to the builder
Card and form layout; tests for visibility (own, office-mate, other office, named member), office-task status moves, admin office filter,
and the import's idempotency.
