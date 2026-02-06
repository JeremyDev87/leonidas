# Coding Standards

## Purpose
Maintain consistency, readability, and maintainability across the codebase.

## Naming Conventions

### Files
- Use `kebab-case.ts` for all source files
- Test files use `.test.ts` extension
- Examples: `api-client.ts`, `user-service.test.ts`

### Functions and Variables
- Use `camelCase` for functions and variables
- Examples: `getUserById`, `isValid`, `maxRetries`

### Classes and Interfaces
- Use `PascalCase` for classes, interfaces, and types
- Examples: `UserRepository`, `ApiResponse`, `ConfigOptions`

### Constants
- Use `UPPER_SNAKE_CASE` for true constants
- Examples: `MAX_RETRIES`, `DEFAULT_TIMEOUT`, `API_BASE_URL`

## Code Principles

### DRY (Don't Repeat Yourself)
- Extract repeated code into shared functions
- Use parameters to handle variations
- Consider creating utilities for common operations

### YAGNI (You Aren't Gonna Need It)
- Only implement features that are currently needed
- Avoid speculative generality
- Don't add configuration options "just in case"

### SRP (Single Responsibility Principle)
- Each function should do one thing well
- Keep functions under 50 lines when possible
- Split complex functions into smaller helpers

## Error Handling

### Explicit Error Types
- Use custom error classes for different error categories
- Include context in error messages
- Example: `throw new ValidationError('Email is required', { field: 'email' })`

### Error Boundaries
- Handle errors at module boundaries, not within every function
- Let errors propagate to appropriate handlers
- Use early returns to avoid deep nesting

## Import Organization

### Order
1. External dependencies (from `node_modules`)
2. Internal modules (absolute imports)
3. Relative imports (same directory or parent)

### Style
- Use named imports when possible
- Avoid wildcard imports unless necessary
- Group related imports together

Example:
```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

import { ConfigSchema } from './types';
import { validateConfig } from './validation';

import { defaultOptions } from '../defaults';
```

## Code Quality

### Type Safety
- Prefer explicit types over `any`
- Use type inference where types are obvious
- Add return types for exported functions

### Comments
- Add JSDoc comments for public APIs only
- Use inline comments to explain "why", not "what"
- Keep comments up-to-date with code changes
