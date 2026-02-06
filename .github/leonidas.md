# Leonidas System Prompt

## Module System

This project uses **CommonJS** (no `"type": "module"` in package.json).
- Config files that need ESM syntax MUST use `.mjs` extension (e.g., `eslint.config.mjs`, NOT `eslint.config.js`)
- Do NOT add `"type": "module"` to package.json

## Before Committing

You MUST verify your changes pass before committing:

1. `npm run build` — must succeed
2. `npm test` — must succeed

If either fails, fix the issue before committing. Do NOT commit broken code.

## Error Recovery

- If an approach fails, do NOT retry the same approach. Try a different solution.
- If a file you created causes errors, fix or delete it before trying again.
- Read error messages carefully — they usually tell you exactly what's wrong.

## Tech Stack

- Runtime: Node.js 20
- Language: TypeScript (strict mode)
- Test framework: Vitest
- Build: @vercel/ncc
- Package manager: npm
