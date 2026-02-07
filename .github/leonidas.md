# Leonidas System Prompt

<!--
  This file defines repository-specific instructions for the Leonidas agent.
  The content here is appended to Leonidas's default system prompt when it analyzes
  and implements code changes in your repository.

  Customize this file to match your project's conventions, tech stack, and workflow.
-->

## Module System

This project uses **CommonJS** (no `"type": "module"` in package.json).

- Config files that need ESM syntax MUST use `.mjs` extension (e.g., `eslint.config.mjs`, NOT `eslint.config.js`)
- Do NOT add `"type": "module"` to package.json

<!--
  ⚠️ Module system configuration is critical - incorrect settings will break the build.
  If your project uses ESM instead, update this section to specify the opposite rules.
-->

## Before Committing

You MUST verify your changes pass before committing:

1. `npm run build` — must succeed
2. `npm test` — must succeed

If either fails, fix the issue before committing. Do NOT commit broken code.

<!--
  This prevents broken code from entering the repository.
  Adjust these commands based on your project's scripts (e.g., `yarn test`, `pnpm build`).
  Remove checks that don't apply (e.g., if you don't have tests yet).
-->

## Error Recovery

- If an approach fails, do NOT retry the same approach. Try a different solution.
- If a file you created causes errors, fix or delete it before trying again.
- Read error messages carefully — they usually tell you exactly what's wrong.

<!--
  This helps the agent avoid getting stuck in loops when implementation attempts fail.
  It encourages adaptive problem-solving rather than repeated retries.
-->

## Tech Stack

- Runtime: Node.js 20
- Language: TypeScript (strict mode)
- Test framework: Vitest
- Build: @vercel/ncc
- Package manager: npm

<!--
  📝 Update this section to match YOUR project's stack:
  - List the exact Node version (impacts async features, APIs)
  - Specify language (TypeScript, JavaScript, Python, Go, etc.)
  - Name test frameworks (Jest, Mocha, pytest, etc.)
  - List build tools (webpack, esbuild, tsc, etc.)
  - Mention any critical libraries (React, Express, etc.)

  This helps the agent write idiomatic code for your stack.
-->

## Coding Style

<!--
  Define your coding conventions here. Be specific about:
  - Naming conventions (camelCase, snake_case, PascalCase)
  - Code organization (file structure, module patterns)
  - Comment style (JSDoc, inline, etc.)
  - Error handling patterns
  - Logging conventions

  Examples below — replace with your actual conventions:
-->

### File Organization

- Source code in `src/`
- Tests colocated with source files (e.g., `foo.ts` and `foo.test.ts`)
- Configuration files in project root
- Build output in `dist/` (git-ignored)

### Naming Conventions

- **Files:** `kebab-case.ts` (e.g., `api-client.ts`, `user-service.ts`)
- **Functions/Variables:** `camelCase` (e.g., `getUserById`, `isValid`)
- **Classes/Interfaces:** `PascalCase` (e.g., `UserRepository`, `ApiResponse`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`, `DEFAULT_TIMEOUT`)

### Code Quality

- Prefer explicit types over `any` in TypeScript
- Functions should do one thing and do it well
- Keep functions under 50 lines when possible
- Use early returns to avoid deep nesting
- Add JSDoc comments for public APIs only

<!--
  💡 TIP: Include examples of patterns you want followed:

  ```typescript
  // Good: Early return
  function validateUser(user: User): boolean {
    if (!user.email) return false;
    if (!user.name) return false;
    return true;
  }

  // Avoid: Deep nesting
  function validateUser(user: User): boolean {
    if (user.email) {
      if (user.name) {
        return true;
      }
    }
    return false;
  }
  ```
-->

## Architecture Guidelines

<!--
  Describe your project's architecture patterns.
  This helps the agent understand where different code belongs.
-->

### Project Structure

```
src/
├── prompts/       # System prompts and templates
├── modes/         # Plan and execute mode logic
├── utils/         # Shared utility functions
└── index.ts       # Entry point
```

<!--
  Update this tree to match your actual structure.
  Add notes about architectural layers if applicable (e.g., controllers, services, repositories).
-->

### Architectural Patterns

- Keep I/O operations (file system, API calls) separate from business logic
- Use dependency injection for testability
- Prefer composition over inheritance
- Handle errors at module boundaries, not within every function

<!--
  Specify the design patterns your team follows:
  - MVC, Clean Architecture, Hexagonal, etc.
  - State management patterns (Redux, MobX, etc.)
  - API design patterns (REST, GraphQL, gRPC)
-->

## Testing Requirements

<!--
  Define your testing standards and expectations.
-->

### Test Coverage

- Add tests for new features and bug fixes
- Unit tests for business logic
- Integration tests for API endpoints
- Aim for meaningful tests, not just coverage percentage

<!--
  Adjust based on your project's test maturity:
  - "All PRs must include tests" (strict)
  - "Add tests for critical paths" (moderate)
  - "Tests welcome but not required" (lenient)
-->

### Test Organization

- Test files use `.test.ts` extension
- Mirror source structure in test organization
- Use `describe` blocks to group related tests
- Test names should describe the behavior being verified

```typescript
// Example test structure
describe("UserService", () => {
  describe("getUserById", () => {
    it("returns user when ID exists", () => {
      // test implementation
    });

    it("throws error when ID does not exist", () => {
      // test implementation
    });
  });
});
```

<!--
  Replace with examples matching your test framework (Jest, Vitest, pytest, etc.)
-->

## Security Guidelines

<!--
  Security requirements specific to your project.
-->

- Never commit secrets, API keys, or credentials
- Use environment variables for configuration
- Sanitize user input before processing
- Review code for injection vulnerabilities (SQL, command, XSS)
- Do not disable security features without explicit justification

<!--
  Add project-specific security rules:
  - Authentication/authorization patterns
  - Data encryption requirements
  - Rate limiting approaches
  - Security scanning tools used
-->

## Commit Message Format

<!--
  Standardized commit messages help maintain clear history.
-->

Format: `<type>: <description>`

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring (no behavior change)
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, configs)
- `perf`: Performance improvements
- `style`: Code style/formatting changes

**Examples:**

- `feat: add user authentication endpoint`
- `fix: resolve race condition in file processor`
- `docs: update API documentation for webhooks`
- `test: add integration tests for payment flow`

<!--
  If you follow Conventional Commits or a different standard, specify it here.
  Include examples of good commit messages for your team.
-->

## Pull Request Guidelines

<!--
  Already defined in Leonidas's default prompt, but you can add project-specific rules here.
-->

- Keep PRs focused on a single concern
- Link to related issues using `Closes #N` or `Fixes #N`
- Update documentation if behavior changes
- Ensure CI checks pass before requesting review

<!--
  Add any PR template requirements or review process specifics:
  - Required approvers
  - PR size limits
  - Changelog update requirements
-->

## Dependencies

<!--
  Guidelines for managing project dependencies.
-->

- Use exact versions for production dependencies
- Document why each dependency is needed
- Prefer well-maintained libraries with active communities
- Audit dependencies regularly for security issues

<!--
  Include package manager specifics:
  - npm/yarn/pnpm commands
  - Monorepo considerations
  - Private registry configuration
-->

## Documentation Standards

<!--
  What documentation is expected with code changes?
-->

- Update README.md when adding major features
- Add inline comments for complex logic
- Keep documentation close to the code it describes
- Use JSDoc for public APIs and exported functions

<!--
  Specify what documentation artifacts your project maintains:
  - API documentation (OpenAPI, Swagger, etc.)
  - Architecture Decision Records (ADRs)
  - Runbooks or operational guides
-->

---

<!--
  💡 CUSTOMIZATION TIPS:

  1. **Start Simple:** Don't overwhelm the agent with too many rules initially.
     Add guidelines as patterns emerge in your codebase.

  2. **Be Specific:** "Use TypeScript" is vague. "Use explicit return types for
     all exported functions" is actionable.

  3. **Include Examples:** Show code snippets demonstrating preferred patterns
     vs. anti-patterns.

  4. **Link to Resources:** Reference your team's style guide, architecture docs,
     or contribution guidelines for more details.

  5. **Keep It Updated:** Review this file periodically as your project evolves.
     Remove obsolete rules and add new conventions.

  6. **Test Changes:** After updating this file, observe how the agent's behavior
     changes in plan and execute modes. Refine based on results.
-->
