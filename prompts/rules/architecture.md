# Architecture Principles

## Overview

Good architecture makes code easier to understand, test, and modify. These principles guide architectural decisions and code organization.

## Dependency Direction

### High-Level Modules Don't Depend on Low-Level Modules
Dependencies should flow toward abstractions, not implementations:

❌ **Bad:**
```javascript
// high-level business logic
import { PostgresUserRepository } from './postgres-user-repository.js';

class UserService {
  constructor() {
    this.repo = new PostgresUserRepository(); // depends on implementation
  }
}
```

✅ **Good:**
```javascript
// high-level business logic
class UserService {
  constructor(userRepository) {
    this.repo = userRepository; // depends on abstraction
  }
}

// low-level implementation
class PostgresUserRepository {
  async findById(id) { /* postgres-specific code */ }
}
```

### Stable Dependencies
Depend on things that change less frequently than you do:

- ✅ Depend on interfaces/abstractions
- ✅ Depend on well-established libraries
- ❌ Depend on volatile implementations
- ❌ Depend on rapidly changing modules

## Layer Separation

### Organize by Technical Concern
Separate different technical responsibilities:

```
src/
├── routes/          # HTTP request handling
├── services/        # Business logic
├── repositories/    # Data access
└── utils/           # Shared utilities
```

### Keep Layers Decoupled
Each layer should only know about the layer directly below it:

- Routes call Services
- Services call Repositories
- Repositories call Database
- No skipping layers (Routes shouldn't call Repositories directly)

### Example: User Management
```javascript
// routes/user-routes.js
// Handles HTTP concerns only
router.get('/users/:id', async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json(user);
});

// services/user-service.js
// Contains business logic
export async function getUserById(id) {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError('User not found');
  return sanitizeUser(user);
}

// repositories/user-repository.js
// Handles data access only
export async function findById(id) {
  return database.query('SELECT * FROM users WHERE id = ?', [id]);
}
```

## Single Responsibility Principle

### Modules Should Have One Reason to Change
Each module should focus on a single concern:

❌ **Bad:** `user-handler.js` that validates, saves, sends emails, and logs
✅ **Good:** Separate modules for validation, persistence, notifications, and logging

### High Cohesion
Group related functionality together:

✅ **Good:**
```
auth/
├── password-hasher.js
├── token-generator.js
└── auth-middleware.js
```

❌ **Bad:** Password hashing in `utils.js`, token generation in `helpers.js`, middleware in `middleware.js`

### Low Coupling
Minimize dependencies between modules:

- ✅ Pass dependencies explicitly (dependency injection)
- ✅ Use events for cross-cutting concerns (logging, analytics)
- ❌ Global state shared between modules
- ❌ Tight coupling through direct imports of volatile modules

## File Organization

### Group by Feature, Not Type
Organize around features rather than technical categories:

✅ **Good (Feature-based):**
```
src/
├── user/
│   ├── user-service.js
│   ├── user-repository.js
│   └── user-routes.js
├── product/
│   ├── product-service.js
│   ├── product-repository.js
│   └── product-routes.js
```

❌ **Bad (Type-based):**
```
src/
├── services/
│   ├── user-service.js
│   └── product-service.js
├── repositories/
│   ├── user-repository.js
│   └── product-repository.js
```

### Colocate Related Files
Keep test files and related code together:

```
src/
├── user/
│   ├── user-service.js
│   ├── user-service.test.js
│   ├── user-repository.js
│   └── user-repository.test.js
```

### Index Files for Clean Imports
Use `index.js` to expose public APIs:

```javascript
// user/index.js
export { UserService } from './user-service.js';
export { UserRepository } from './user-repository.js';
// user-routes.js is internal, not exported

// other files can import cleanly
import { UserService } from './user/index.js';
```

## Avoid Circular Dependencies

### Circular dependencies cause problems:

❌ **Bad:**
```javascript
// a.js
import { b } from './b.js';
export const a = () => b();

// b.js
import { a } from './a.js';
export const b = () => a();
```

✅ **Good:** Extract shared logic to a third module:
```javascript
// shared.js
export const shared = () => { };

// a.js
import { shared } from './shared.js';
export const a = () => shared();

// b.js
import { shared } from './shared.js';
export const b = () => shared();
```

## Interface Segregation

### Don't Force Clients to Depend on Unused Methods
Keep interfaces focused:

❌ **Bad:**
```javascript
class Repository {
  findById(id) { }
  findAll() { }
  create(data) { }
  update(id, data) { }
  delete(id) { }
  search(query) { }
  paginate(page, size) { }
}
```

✅ **Good:**
```javascript
class ReadRepository {
  findById(id) { }
  findAll() { }
}

class WriteRepository {
  create(data) { }
  update(id, data) { }
  delete(id) { }
}
```

## Keep It Simple

### Avoid Premature Abstraction
Don't create abstractions until you need them:

- ❌ Abstract factory patterns for one implementation
- ❌ Dependency injection containers for simple scripts
- ❌ Event buses for direct function calls
- ✅ Simple, direct code that's easy to understand

### YAGNI: You Aren't Gonna Need It
Build what's needed now, not what might be needed later:

- ✅ Start simple; refactor when requirements change
- ❌ Build extensibility hooks "just in case"
- ❌ Add configuration for hypothetical future needs

### Rule of Three
Wait until you have three similar cases before abstracting:

- First time: Just write it
- Second time: Copy and modify (note the duplication)
- Third time: Now abstract the pattern
