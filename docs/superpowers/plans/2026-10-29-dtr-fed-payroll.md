# DTR Fed Payroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically derive payroll attendance inputs from DTR while preserving super-admin overrides and an auditable DTR snapshot.

**Architecture:** A focused service computes cutoff attendance using existing DTR statuses, schedules, grace settings, and employee presence rules. Payroll creation sends those defaults to the existing editable preview; store persists source and final values, and the saved batch displays the source snapshot and override reason.

**Tech Stack:** Laravel 13, Eloquent migrations, Inertia, React 19, existing payroll calculator.

**Spec:** `docs/superpowers/specs/2026-10-29-dtr-fed-payroll.md`

## Global Constraints

- Preserve existing Excel payroll formulas and finalized payroll immutability.
- Keep all multi-record payroll writes inside the existing transaction.
- Log code changes under `## [Unreleased]` in `CHANGELOG.md`.
- Do not deploy or change live payroll data.
- Do not add or run tests unless the user asks for tests or verification.

## Review Focus

- Half days must reduce attendance by 0.5, not one full day.
- An afternoon-only half day must not accrue late minutes against a morning shift.
- `missing_out`, future, and in-progress DTR must remain visible for review.
- Client-supplied peso amounts remain ignored; tardiness deduction is recalculated server-side.
- Existing payroll items remain readable after adding nullable DTR snapshot columns.

---

### Task 1: Calculate DTR payroll attendance

**Files:**
- Create `app/Services/DtrPayrollAttendanceCalculator.php`
- Modify `app/Http/Controllers/Admin/PayrollController.php`

- [x] Return weighted present days, DTR-status absences, tardiness minutes, and unresolved dates for each employee and cutoff.
- [x] Use the calculator in payroll preview and recompute the authoritative source snapshot during store.

### Task 2: Persist attendance source and override audit

**Files:**
- Create a migration adding DTR absence, DTR tardiness, unresolved dates, and override reason to `payroll_items`.
- Modify `app/Models/PayrollItem.php`
- Modify `app/Http/Requests/Admin/StorePayrollRequest.php`
- Modify `app/Http/Controllers/Admin/PayrollController.php`

- [x] Require an override reason when any attendance input differs from the DTR defaults or unresolved DTR is accepted.
- [x] Store source attendance values separately from the values used in payroll.
- [x] Block finalization for unresolved DTR when no override reason is recorded.

### Task 3: Review and display attendance values

**Files:**
- Modify `resources/js/Pages/Admin/PayrollCreate.jsx`
- Modify `resources/js/Pages/Admin/PayrollShow.jsx`
- Modify `CHANGELOG.md`

- [x] Prefill attendance values from DTR, identify unresolved days, and expose a reason field when the admin overrides attendance.
- [x] Show saved DTR baseline values and the override reason on the payroll batch.
- [x] Update the calculation help text to describe automatic DTR attendance and workbook-aligned payroll calculations.

### Task 4: Verify required project checks

- [x] Run Pint and the frontend build; inspect the diff and working-tree status.
- [x] Do not run tests; the user did not ask for tests or verification.
