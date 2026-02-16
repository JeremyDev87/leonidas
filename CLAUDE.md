# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Leonidas

Leonidas is a GitHub Action that automates issue-to-PR workflows using Claude Code. It operates in two phases:

1. **Plan** (triggered by labeling an issue with `leonidas`) — Claude analyzes the issue and posts an implementation plan as a comment
2. **Execute** (triggered by `/approve` comment) — Claude follows the approved plan, makes commits, and creates a PR

The action has two entry points: `src/main.ts` (prompt preparation for Claude Code) and `src/post_process_cli.ts` (post-workflow tasks like linking sub-issues, posting comments, rescuing partial progress).

## Commands

```bash
npm test                # Run all tests (vitest, single run)
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report (90% threshold for all metrics)
npm run lint            # ESLint + Prettier check
npm run lint:fix        # Auto-fix lint and formatting
npm run typecheck       # tsc --noEmit
npm run build           # ncc bundle → dist/index.js + dist/post_process_cli/
```

Run a single test file:

```bash
npx vitest run src/config.test.ts
```

Before committing, all four must pass: `npm run lint && npm run typecheck && npm test && npm run build`

## Architecture

```
src/
├── main.ts                 # Entry point: reads inputs, loads config, builds prompts, sets GH Action outputs
├── config.ts               # Loads leonidas.config.yml, merges with action inputs, loads rule files
├── github.ts               # GitHub API wrapper (createGitHubClient factory returning method object)
├── types.ts                # Shared TypeScript interfaces (LeonidasConfig, ActionInputs, GitHubContext, etc.)
├── i18n.ts                 # 8-language translation map (en, ko, ja, zh, es, de, fr, pt)
├── comment_builder.ts      # Pure functions for building GitHub comment strings
├── post_process_cli.ts     # Separate CLI entry: link-subissues, post-completion, post-failure, rescue, post-process-pr, trigger-ci
├── utils/
│   └── sanitize.ts         # Prompt injection defense (wrapUserContent, escapeForShellArg)
├── prompts/
│   ├── system.ts           # Builds system prompt from prompts/system.md + .github/leonidas.md + rules
│   ├── plan.ts             # Plan-mode prompt with 5-phase methodology and restricted tools
│   └── execute.ts          # Execute-mode prompt with branch/PR instructions
├── templates/
│   └── plan_comment.ts     # Plan comment formatting
└── test-helpers/
    └── main.helpers.ts     # Shared test utilities
```

Key data flow: `action.yml` → `main.ts` (reads inputs, config, context) → builds prompt → writes to temp file → `claude-code-action` picks it up → post-process steps run `post_process_cli.ts`.

## Module System

**CommonJS only.** Do not add `"type": "module"` to package.json. Config files needing ESM syntax must use `.mjs` extension (e.g., `eslint.config.mjs`).

## Code Conventions

- **No `any`** — `@typescript-eslint/no-explicit-any: "error"` (relaxed in test files)
- **No floating promises** — `@typescript-eslint/no-floating-promises: "error"`
- Double quotes, semicolons, trailing commas, 100-char line width, 2-space indent
- Files: `snake_case.ts`, Functions/Variables: `camelCase`, Types: `PascalCase`, Constants: `UPPER_SNAKE_CASE`
- Tests colocated: `foo.ts` alongside `foo.test.ts`
- Use `??` (nullish coalescing) over `||` for default values
- Vitest globals enabled — no need to import `describe`, `it`, `expect`, `vi`

## Commit Messages

Format: `<type>: <description>` — types: feat, fix, refactor, docs, test, chore, perf, style

Optional scope: `<type>(<scope>): <description>` (e.g., `feat(i18n): add Portuguese translations`)
