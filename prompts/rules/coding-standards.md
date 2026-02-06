# Coding Standards

## Overview

Maintain consistent, readable, and maintainable code by following these conventions and principles. These standards help ensure code quality and team collaboration.

## Naming Conventions

### Variables and Functions
Use `camelCase` for variables and functions:
```javascript
const userName = "Alice";
const isValid = true;
function getUserById(id) { }
function calculateTotal(items) { }
```

### Classes and Interfaces
Use `PascalCase` for classes, interfaces, and types:
```javascript
class UserRepository { }
interface ApiResponse { }
type UserData = { };
```

### Constants
Use `UPPER_SNAKE_CASE` for constants:
```javascript
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;
const API_BASE_URL = "https://api.example.com";
```

### Files
Use `kebab-case` for file names:
```
api-client.ts
user-service.ts
auth-middleware.ts
```

## Core Principles

### DRY (Don't Repeat Yourself)
Extract repeated logic into reusable functions:

❌ **Bad:**
```javascript
const user1Total = user1.items.reduce((sum, item) => sum + item.price, 0);
const user2Total = user2.items.reduce((sum, item) => sum + item.price, 0);
```

✅ **Good:**
```javascript
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
const user1Total = calculateTotal(user1.items);
const user2Total = calculateTotal(user2.items);
```

### YAGNI (You Aren't Gonna Need It)
Don't add functionality until it's actually needed:

❌ **Bad:** Adding configuration options, feature flags, and extensibility hooks for simple requirements
✅ **Good:** Implement exactly what's needed now; refactor when requirements change

### SRP (Single Responsibility Principle)
Each function should do one thing well:

❌ **Bad:**
```javascript
function processUser(user) {
  validateUser(user);
  saveToDatabase(user);
  sendWelcomeEmail(user);
  logActivity(user);
}
```

✅ **Good:**
```javascript
function processUser(user) {
  const validated = validateUser(user);
  return saveUser(validated);
}
// Email and logging handled separately by event system
```

## Code Organization

### Function Length
Keep functions focused and concise:
- Aim for under 50 lines when possible
- If a function exceeds 50 lines, consider breaking it into smaller functions
- Extract complex logic into helper functions with descriptive names

### Nesting Depth
Prefer early returns to avoid deep nesting:

❌ **Bad:**
```javascript
function validateUser(user) {
  if (user.email) {
    if (user.name) {
      if (user.age >= 18) {
        return true;
      }
    }
  }
  return false;
}
```

✅ **Good:**
```javascript
function validateUser(user) {
  if (!user.email) return false;
  if (!user.name) return false;
  if (user.age < 18) return false;
  return true;
}
```

## Error Handling

### Use Specific Error Types
Create or use specific error classes:

❌ **Bad:** `throw new Error("Something went wrong")`
✅ **Good:** `throw new ValidationError("Email is required")`

### Handle Errors at Boundaries
Don't wrap every function call in try-catch. Handle errors at module boundaries:

❌ **Bad:** Try-catch in every function
✅ **Good:** Handle errors in API routes, CLI handlers, or service boundaries

### Fail Fast
Validate inputs early and throw errors immediately:

✅ **Good:**
```javascript
function divide(a, b) {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}
```

## Import Organization

Group and order imports logically:

```javascript
// 1. External dependencies
import express from "express";
import bcrypt from "bcrypt";

// 2. Internal modules
import { UserService } from "./services/user-service.js";
import { validateRequest } from "./middleware/validation.js";

// 3. Types
import type { User, ApiResponse } from "./types.js";
```

## Comments

### When to Comment
- Complex algorithms that aren't self-evident
- Public APIs (use JSDoc format)
- Workarounds for bugs in dependencies
- Non-obvious business logic

### When NOT to Comment
- What the code does (should be self-evident from names)
- Commented-out code (delete it; use version control)
- Obvious statements like `// increment counter` above `counter++`

### JSDoc for Public APIs
```javascript
/**
 * Retrieves a user by their unique identifier.
 *
 * @param {string} id - The user's unique ID
 * @returns {Promise<User>} The user object
 * @throws {NotFoundError} If user doesn't exist
 */
async function getUserById(id) {
  // implementation
}
```

## Type Safety (TypeScript)

### Avoid `any`
Prefer explicit types over `any`:

❌ **Bad:** `function process(data: any)`
✅ **Good:** `function process(data: UserData)`

### Use Type Inference
Let TypeScript infer types when obvious:

❌ **Unnecessary:** `const count: number = 5;`
✅ **Good:** `const count = 5;`

### Explicit Return Types
Use explicit return types for exported functions:

✅ **Good:**
```typescript
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```
