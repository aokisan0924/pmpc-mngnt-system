# Team tasks: assign one task to several people, one copy each (short design)

Date: 2026-11-05. Step 1 of 2. Step 2 (a single shared task done once) gets its own design and release.

## Why
An admin often gives the same task to several people, from different offices. Today the form takes one person (or a whole office), so the admin creates the task again and again. Some tasks need each person's own progress (this step); others are one shared task (step 2).

## What to build
In the Team tasks "New Task" form, the "For" choice becomes:

- **Specific people** (default): a searchable checklist of active employees, grouped by office, with a "select all" link per office and a row of selected-name chips with a remove button. At least one person is required.
- **Whole office**: as today, the Office dropdown and no named person.

On save, one task is created per selected person: same title, notes, due date, category and priority; the office of each copy is that person's own office (as today when a single person is chosen). Each person's copy has its own status, can be moved, edited and deleted on its own, and appears on the board and in the counts as an ordinary task.

- **Notifications**: one assignment notification per person, same as a single assignment today.
- **Repeats**: if a repeat is chosen, each person gets their own repeat rule and first copy, exactly as a single person does today.
- **Success message**: "Task added for N people." (or "Task added." for one person).
- **Editing an existing task** is unchanged: the form shows one person (or whole office) as now; the multi-select appears only when creating.

## Server
`TeamTaskRequest` accepts `employee_ids` (array, 1 to 25 items, distinct, each an active employee) for creating, in addition to the existing `employee_id` / `office` fields for editing and whole-office. `TeamTaskController::store` loops over the people inside one `DB::transaction`, creating the rule (when repeating) and the task per person, then notifies each after the transaction. A whole-office create and a single `employee_id` create behave as today.

## Constraints
Admin accent `#26215C`; theme tokens; keyboard operable checklist (checkbox inputs with labels, search field labelled); phone width usable (the list scrolls inside the modal). Keep the shared option out of the form for now; it is not shown until step 2.

## My calls (change any)
- Limit of 25 people per submit, to keep one request small.
- If one person in the list was deactivated between opening the form and saving, the whole save fails with a form error and nothing is created.
- Submitting twice creates the tasks twice, same as today for a single person.
- No "copy these tasks to other people later" action in this step.

## Not doing
Shared tasks, assigning several people while editing, changing the notifier.

## Approaches
1. **Loop over the existing single-person create path (chosen).** Reuses validation, office lookup, repeats and notifications; the only new code is the loop, the array validation and the form control.
2. A separate bulk-create endpoint. Rejected: duplicates the repeat and notification logic.

## Tests
Several people create several tasks with the right owners and offices; people from two offices get their own office; one notification each; repeat creates a rule per person; nothing is created when one person is invalid or inactive; limit of 25 enforced; duplicates in the list rejected; the single-person and whole-office paths still work; editing is unchanged; employees (non-admin) still cannot call it.
