---
name: code-review-specialist
description: >-
  Use this skill when asked to review code, conduct PR reviews, assess code quality,
  audit security, or check for performance bottlenecks and edge cases.
---

# Code Review Specialist Skill

This skill guides rigorous, structured, and constructive code reviews following industry and Google Antigravity engineering excellence standards.

## 1. Review Objectives & Dimensions

When reviewing code, evaluate it across five core pillars:

1. **Correctness & Logic**:
   - Does the implementation achieve the intended behavior without unintended side-effects?
   - Are edge cases (null values, empty collections, unexpected data types, zero divisions) handled?
   - Are boundary conditions in loops, date calculations, and pagination verified?
2. **Security (OWASP Top 10)**:
   - **SQL Injection**: Are raw queries parameterized? Are Eloquent / PDO bindings used?
   - **XSS**: Is user-generated content escaped or sanitized in React components?
   - **CSRF & Authentication**: Are mutations protected by CSRF tokens and authorization gates/policies?
   - **Authorization/IDOR**: Can a user access or modify resources belonging to another user?
   - **Secrets & Sensitive Data**: Are API keys, passwords, or tokens hardcoded? (Ensure they use `.env`).
3. **Performance & Scalability**:
   - **Database**: Are there N+1 query patterns? Are required indexes present on foreign keys and search filters?
   - **Memory & Assets**: Are large datasets paginated? Are client-side bundles code-split when appropriate?
4. **Maintainability & Clean Architecture**:
   - Are responsibilities cleanly decoupled (Single Responsibility Principle)?
   - Are classes, methods, and variables clearly and expressively named?
   - Is duplicate logic extracted into shared services, actions, or utilities?
5. **Testability**:
   - Is the new or modified logic accompanied by unit or feature tests?
   - Are edge cases covered by assertions?

## 2. Review Output Format

Structure the review report clearly with prioritized actionable feedback:

```markdown
### Summary
Brief 1-2 sentence overview of the changeset and overall health.

### Critical / High Priority (Must Fix)
- [ ] **[File & Line]**: Issue description, why it matters, and recommended diff/fix.

### Medium Priority (Recommended Improvements)
- [ ] **[File & Line]**: Performance or architectural optimization.

### Low Priority / Nitpicks
- [ ] **[File & Line]**: Minor styling, naming suggestions, or comment clarity.

### Positive Highlights
- Commend clever solutions, clean abstractions, or well-written tests.
```
