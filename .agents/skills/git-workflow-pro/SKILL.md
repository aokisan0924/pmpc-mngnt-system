---
name: git-workflow-pro
description: >-
  Use this skill when managing git branches, creating commits, crafting conventional commit messages,
  resolving merge conflicts, or preparing pull requests.
---

# Git Workflow & Version Control Standards

This skill enforces clean, atomic, and structured version control practices following Conventional Commits and trunk-based development principles.

## 1. Conventional Commit Standard

Format commit messages using the standard type-prefix convention:

```text
<type>(<optional-scope>): <concise-description-in-present-tense>

[optional body explaining why this change was made]

[optional footer, e.g., Closes #123]
```

### Supported Types:
- **`feat`**: A new user-facing feature or domain capability.
- **`fix`**: A bug fix.
- **`refactor`**: Code restructuring that neither fixes a bug nor adds a feature.
- **`perf`**: A code change that improves performance or query efficiency.
- **`test`**: Adding missing tests or correcting existing tests.
- **`style`**: Changes that do not affect the meaning of the code (white-space, formatting with Pint).
- **`docs`**: Documentation updates only.
- **`chore`**: Maintenance tasks, dependency updates, or configuration adjustments.

### Examples:
- `feat(dtr): enforce sequential 4-punch locking with grace period`
- `fix(payroll): correct rest-day overtime multiplier calculation`
- `style(admin): align portal card padding and soft emerald status badges`

## 2. Safe Git Operations Runbook

1. **Check Status & Diffs**:
   - Always run `git status -s` and `git diff` before staging to verify only intended files are modified.
   - Never stage temporary logs, environment files (`.env`), or operating system artifacts (`.DS_Store`, `Thumbs.db`).
2. **Atomic Commits**:
   - Keep commits focused on a single logical change. Do not bundle unrelated refactorings with bug fixes.
3. **Clean Branch Management**:
   - Branch naming convention: `<type>/<short-description>`, e.g., `feature/dtr-export-pdf` or `fix/thirteenth-month-formula`.
   - Never force-push (`git push --force`) to shared main/master branches.
4. **Merge Conflict Resolution**:
   - Examine conflicting blocks carefully (`<<<<<<< HEAD`, `=======`, `>>>>>>>`).
   - Retain intended logic from both branches, recompile assets (`npm run build`), and run tests (`php artisan test`) before committing the merge.
