---
name: code-verification-quality
description: >-
  Use this skill to run tests, format code with Pint, check PHP/React compilation,
  and verify system health before marking tasks as complete.
---

# Code Verification & Quality Assurance Runbook

This skill outlines the mandatory verification sequence to ensure code reliability, styling adherence, and zero regressions across both the backend and frontend.

## 1. Automated Verification Sequence

Run the following checks systematically whenever code modifications are made:

### Step 1: Code Formatting & Linting (Pint)
Format all PHP code according to the project's Laravel Pint configuration:
```powershell
vendor\bin\pint
```
Ensure there are no remaining styling or syntax violations.

### Step 2: Backend Test Suite (PHPUnit / Artisan Test)
Run the automated test suite to confirm no existing functionality was broken:
```powershell
php artisan test
```
If specific modules were touched (e.g. Payroll or DTR), run targeted tests:
```powershell
php artisan test --filter=PayrollTest
```

### Step 3: Frontend Asset Compilation
Ensure React 19 and Tailwind CSS 4 components compile without TypeScript/JSX or bundling errors:
```powershell
npm run build
```

### Step 4: Database & Schema Health
If migrations or models were added/updated, verify migration status:
```powershell
php artisan migrate:status
```
Ensure migrations are rollback-safe:
```powershell
php artisan migrate:rollback --step=1
php artisan migrate
```

### Step 5: Configuration & Route Cache
When adding or modifying routes or configuration keys, clear the caches:
```powershell
php artisan route:clear
php artisan config:clear
php artisan cache:clear
```

## 2. Regression & Edge-Case Checklist

- **Authorization Checks**: Verify that non-admin employees cannot access `/admin/*` endpoints and cannot see other employees' payslips or DTR edit requests.
- **Null Safety**: Check for possible null values on relationships (e.g. employee without an active compensation profile or department).
- **Timezone Integrity**: Ensure all timestamps use the cooperative's standard timezone (`Asia/Manila`) so attendance punches and cutoffs don't suffer from UTC drift.
