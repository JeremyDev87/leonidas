# Plan Quality Standards

## Overview

Every implementation plan must meet high-quality standards to ensure successful execution. This checklist provides concrete criteria for evaluating plan quality before implementation begins.

## Quality Criteria

### 1. Specificity

Plans must reference exact locations and components:

- ✅ **Good:** "Add password hashing using bcrypt in `src/auth/password.ts:validatePassword()`"
- ❌ **Bad:** "Update the authentication system"

**Requirements:**

- Reference exact file paths (e.g., `src/utils/parser.ts:42-56`)
- Name specific functions, classes, or variables to modify
- Include line numbers for large files when helpful

### 2. Testability

Every step must have clear success criteria:

- ✅ **Good:** "Add error handling to API endpoints, verify with `npm test` and manual testing of error cases"
- ❌ **Bad:** "Add error handling to API endpoints"

**Requirements:**

- Include explicit verification method for each step
- Specify expected outcomes (e.g., "tests should pass", "build should succeed")
- Define how to confirm the step worked correctly

### 3. Granularity

Steps should be atomic but not overly granular:

- ✅ **Good:** "Implement password hashing function in `src/auth/password.ts` with bcrypt integration"
- ❌ **Too granular:** Step 1: Open file, Step 2: Add import, Step 3: Write function signature
- ❌ **Too vague:** "Update authentication system"

**Requirements:**

- Each step represents one logical change (one potential commit)
- Steps are independently understandable and verifiable
- Avoid splitting trivial operations into multiple steps

### 4. Coverage

Plans must address all acceptance criteria:

- ✅ All requirements from the issue are addressed
- ✅ Build verification and test execution included
- ❌ Missing requirements or skipping validation

**Requirements:**

- Map each acceptance criterion to specific plan steps
- Include verification steps for all changes
- Don't skip edge cases or error handling

### 5. Convention Adherence

Follow existing codebase patterns:

- ✅ Uses project's naming conventions, file organization, and style
- ❌ Introduces inconsistent patterns or ignores project conventions

**Requirements:**

- Study existing code patterns before planning
- Match the project's architectural style
- Follow established naming and organization conventions

## Anti-Patterns to Avoid

### Too Vague

❌ "Update the authentication system"
✅ "Add password hashing using bcrypt in `src/auth/password.ts:validatePassword()`"

### Too Granular

❌ Step 1: Open file, Step 2: Add import, Step 3: Write function signature, Step 4: Add body
✅ Step 1: Implement password hashing function in `src/auth/password.ts` with bcrypt integration

### Missing Verification

❌ "Add error handling to API endpoints"
✅ "Add error handling to API endpoints, verify with `npm test` and manual testing of error cases"

### Ignoring Patterns

❌ Using classes when the entire codebase uses functional patterns
✅ Following the existing functional programming style with pure functions

### Over-Engineering

❌ "Create abstract factory pattern with dependency injection container"
✅ "Add simple helper function following existing utility pattern"

### Too Many Steps

❌ Plans with 10+ steps that exceed turn budget
✅ Plans with 5-7 well-scoped steps that fit within constraints

### Missing Dependencies

❌ Step 3 uses a function defined in Step 5
✅ Steps ordered so dependencies are created before use

## Self-Verification Protocol

Before submitting a plan, verify:

- [ ] **Specific files named:** Every step references exact file paths
- [ ] **Verification methods included:** Each step has clear success criteria
- [ ] **≤7 steps total:** Plan fits within typical turn budget
- [ ] **All acceptance criteria addressed:** Nothing from the issue is missing
- [ ] **No step exceeds 5 turns:** Each step is feasibly completable
- [ ] **Follows conventions:** Checked existing code and matched its patterns
- [ ] **Dependencies explicit:** Steps are ordered correctly
- [ ] **Within scope:** No scope creep beyond issue requirements

If any item is unchecked, revise the plan before proceeding.
