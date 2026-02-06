# Coding Standards

Follow these conventions to maintain code consistency and quality.

## Naming Conventions

### Files
- Use `kebab-case.ts` for source files (e.g., `api-client.ts`, `user-service.ts`)
- Test files: `<filename>.test.ts` (e.g., `api-client.test.ts`)
- Configuration files: Follow ecosystem conventions (e.g., `tsconfig.json`, `eslint.config.mjs`)

### Functions and Variables
- Use `camelCase` for functions and variables
- Examples: `getUserById`, `isValid`, `currentUser`, `maxRetries`
- Boolean variables should be prefixed with `is`, `has`, `should`, or `can`

### Classes and Interfaces
- Use `PascalCase` for classes, interfaces, and types
- Examples: `UserRepository`, `ApiResponse`, `ConfigOptions`
- Interface names should describe what they represent, not implementation

### Constants
- Use `UPPER_SNAKE_CASE` for constants
- Examples: `MAX_RETRIES`, `DEFAULT_TIMEOUT`, `API_BASE_URL`

## Core Principles

### DRY (Don't Repeat Yourself)
- Extract repeated logic into functions or utilities
- Use configuration over duplication
- Share common code across modules

### YAGNI (You Aren't Gonna Need It)
- Don't add functionality until it's needed
- Avoid premature abstractions
- Keep solutions simple and focused on current requirements

### SRP (Single Responsibility Principle)
- Each function should do one thing well
- Each module should have one reason to change
- Keep functions under 50 lines when possible

## Error Handling

### Strategy
- Throw errors for exceptional conditions
- Use early returns to avoid deep nesting
- Provide meaningful error messages
- Include context in error messages (what failed, why, what was attempted)

### Example
```typescript
function processFile(path: string): void {
  if (!path) {
    throw new Error("File path is required");
  }
  if (!fs.existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  // Process file...
}
```

## Import Organization

1. External dependencies (npm packages)
2. Internal absolute imports
3. Internal relative imports
4. Type-only imports last (if separated)

Group imports by category with blank lines between groups.
