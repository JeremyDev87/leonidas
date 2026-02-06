# Plan Quality Standards

Use this checklist to evaluate and ensure plan quality before implementation.

## Quality Criteria

### 1. Specificity
- ✅ Reference exact file paths (e.g., `src/utils/parser.ts:42-56`)
- ✅ Name specific functions, classes, or variables to modify
- ❌ Vague references like "update the parser" or "fix the config"

### 2. Testability
- ✅ Include explicit verification method for each step
- ✅ Specify expected outcomes (e.g., "tests should pass", "build should succeed")
- ❌ Steps without clear success criteria

### 3. Atomicity
- ✅ Each step represents one logical change that could be a single commit
- ✅ Steps are independently understandable and verifiable
- ❌ Steps that do multiple unrelated things or are too granular

### 4. Ordering
- ✅ Steps follow dependency order (setup → implementation → verification)
- ✅ Each step builds on the previous one logically
- ❌ Random order or steps that depend on future steps

### 5. Completeness
- ✅ All acceptance criteria from the issue are addressed
- ✅ Includes build verification and test execution
- ❌ Missing requirements or skipping validation

### 6. Feasibility
- ✅ Each step can be completed in 3-5 turns (read, edit, verify)
- ✅ Total plan fits within turn budget (typically ≤7 steps)
- ❌ Steps requiring extensive exploration or too many file changes

### 7. Convention Adherence
- ✅ Follows existing code patterns found in the codebase
- ✅ Uses project's naming conventions, file organization, and style
- ❌ Introduces inconsistent patterns or ignores project conventions

## Anti-Patterns to Avoid

### Too Vague
❌ "Update the authentication system"
✅ "Add password hashing using bcrypt in src/auth/password.ts:validatePassword()"

### Too Granular
❌ Step 1: Open file, Step 2: Add import, Step 3: Write function signature
✅ Step 1: Implement password hashing function in src/auth/password.ts

### Missing Verification
❌ "Add error handling to API endpoints"
✅ "Add error handling to API endpoints, verify with `npm test`"

### Ignoring Patterns
❌ Using classes when the entire codebase uses functional patterns
✅ Following the existing functional programming style

### Over-Engineering
❌ "Create abstract factory pattern with dependency injection container"
✅ "Add simple helper function following existing utility pattern"

### Too Many Steps
❌ Plans with 10+ steps that exceed turn budget
✅ Plans with 5-7 well-scoped steps
