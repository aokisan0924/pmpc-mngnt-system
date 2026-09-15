---
name: laravel-clean-architecture
description: >-
  Use this skill when developing, refactoring, or reviewing Laravel backend code (controllers,
  models, actions, services, migrations, form requests, and database queries) to ensure
  clean architecture, high performance, strict typing, and security.
---

# Laravel Clean Architecture & Best Practices

This skill guides the implementation of idiomatic, maintainable, and high-performance Laravel 11/12/13+ code with PHP 8.2+.

## 1. Architectural Principles

- **Thin Controllers, Focused Actions**: Keep controllers minimal. Delegate multi-step business logic, calculations, or external service calls to dedicated Action classes (`app/Actions/...`) or Service classes (`app/Services/...`).
- **Strict Typing**: Always use `declare(strict_types=1);` in new PHP classes. Specify explicit return types and parameter types for all methods.
- **Form Requests for Validation**: Do not validate directly inside controller methods. Use dedicated Form Request classes (`app/Http/Requests/...`) with explicit `rules()` and descriptive validation messages.
- **Database Transactions for Mutations**: Any multi-table update or monetary transaction (payroll, deductions, DTR reconciliation, balance adjustments) **must** be wrapped in `DB::transaction()`.

## 2. Eloquent & Database Optimization

- **Prevent N+1 Queries**:
  - Always eager load relationships on queries that will be iterated or serialized to Inertia props: `Employee::with(['department', 'compensation', 'dtrRecords'])->get()`.
  - Use `loadMissing()` when a model may already be partially loaded.
- **Mass Assignment Protection**:
  - Explicitly define `$fillable` on all models. Never use `$guarded = []` without strict request filtering.
- **Foreign Key Indexing**:
  - Ensure all foreign keys in migrations have corresponding indexes (`$table->foreignId('employee_id')->constrained()->cascadeOnDelete()->index();`).
- **Safe Migrations**:
  - Always define a corresponding `down()` method.
  - Avoid destructive operations on production columns without a multi-phase migration strategy.

## 3. Inertia.js Controller Responses

- When returning data to Inertia pages, keep the payload lean. Only send fields needed by the React view:
  ```php
  return Inertia::render('Admin/Payroll/Show', [
      'payroll' => $payroll->only(['id', 'cutoff_period', 'status', 'total_net_pay']),
      'items' => PayrollItemResource::collection($payroll->items),
  ]);
  ```
- Use Lazy/Partial data evaluation (`Inertia::lazy(...)`) for heavy datasets or tabs loaded on demand.

## 4. Code Style & Tooling

- Before concluding backend changes, format code using Laravel Pint:
  ```powershell
  vendor\bin\pint
  ```
- Adhere strictly to PSR-12 and Laravel's naming conventions (StudlyCaps for classes, camelCase for methods/variables, snake_case for database columns).
