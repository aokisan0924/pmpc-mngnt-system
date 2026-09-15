---
name: database-migrations-safety
description: >-
  Use this skill when creating or altering database tables, adding indexes, migrating data,
  or designing schema changes to ensure zero data loss and rollback safety.
---

# Database Migrations & Schema Safety

This skill governs relational database schema modifications, ensuring zero data loss, safe indexing, backward compatibility, and atomic transactions.

## 1. Migration Design Standards

- **Always Provide a Complete `down()` Method**:
  - Every `up()` operation must have a deterministic reverse in `down()`.
  - For column additions: `$table->dropColumn('column_name');`
  - For foreign keys: drop the foreign constraint before dropping the column:
    ```php
    $table->dropForeign(['employee_id']);
    $table->dropColumn('employee_id');
    ```
- **Explicit Data Types & Nullability**:
  - Be explicit with precision on monetary and financial amounts: `$table->decimal('daily_rate', 12, 2)->default(0.00);` or `$table->decimal('total_deductions', 12, 2)->default(0.00);`.
  - Avoid leaving columns nullable unless there is a valid business requirement for null values.
- **Index Foreign Keys & Search Fields**:
  - Any column used in `WHERE`, `JOIN`, or `ORDER BY` should be evaluated for indexation:
    ```php
    $table->foreignId('employee_id')->constrained()->cascadeOnDelete()->index();
    $table->index(['cutoff_start', 'cutoff_end']);
    ```

## 2. Safe Schema Alteration Strategy

1. **Adding Columns to Existing Tables**:
   - Supply sensible defaults or set `nullable()` so existing rows remain valid without manual backfills.
2. **Renaming or Dropping Columns**:
   - Never drop or rename columns directly if running services are actively querying them.
   - Use a multi-phase migration:
     - Phase 1: Add new column, write to both old and new.
     - Phase 2: Backfill data from old to new.
     - Phase 3: Switch readers to new column.
     - Phase 4: Drop old column in a subsequent release.
3. **Data Migrations & Seeding**:
   - Separate schema changes from large-scale data transformations. Use dedicated artisan commands or seeders for data manipulation rather than executing heavy loops inside migration `up()` methods.

## 3. Migration Verification Sequence

Always verify migrations locally before committing:
```powershell
php artisan migrate:status
php artisan migrate --pretend
php artisan migrate
php artisan migrate:rollback --step=1
php artisan migrate
```
