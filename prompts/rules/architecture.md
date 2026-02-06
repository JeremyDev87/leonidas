# Architecture Principles

## Purpose
Maintain a clean, scalable, and maintainable codebase architecture.

## Dependency Direction

### Depend on Abstractions
- High-level modules should not depend on low-level modules
- Both should depend on abstractions (interfaces, contracts)
- Example: Business logic depends on repository interface, not concrete database implementation

### Inward Dependencies
- Dependencies should point inward toward core business logic
- External concerns (I/O, frameworks) depend on core, not vice versa
- Core domain should have no external dependencies

## Layer Separation

### Clear Boundaries
- Keep distinct concerns in separate layers
- Examples: presentation, business logic, data access
- Each layer has a single responsibility

### I/O at the Edges
- Keep I/O operations (file system, network, database) at module boundaries
- Pure functions for business logic
- Easier to test and reason about

Example:
```typescript
// ❌ Bad: I/O mixed with logic
function processUserData(userId: string) {
  const user = database.query(`SELECT * FROM users WHERE id = ${userId}`);
  const valid = user.age >= 18;
  return valid;
}

// ✅ Good: I/O separated from logic
function isAdult(user: User): boolean {
  return user.age >= 18;
}

function processUserData(userId: string) {
  const user = userRepository.findById(userId); // I/O at boundary
  return isAdult(user); // Pure logic
}
```

## Single Responsibility

### Module Responsibility
- Each module should have one reason to change
- Group related functionality together
- Split modules that handle multiple concerns

### File Organization
- One primary export per file
- Related helpers can be co-located
- Move to separate files when they grow

## Design Patterns

### Composition Over Inheritance
- Prefer composition and interfaces over class hierarchies
- More flexible and easier to test
- Avoid deep inheritance chains

### Dependency Injection
- Pass dependencies explicitly rather than importing globally
- Enables testing with mocks
- Makes dependencies clear

Example:
```typescript
// ✅ Good: Dependencies injected
class UserService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService
  ) {}

  async registerUser(email: string) {
    const user = await this.userRepo.create(email);
    await this.emailService.sendWelcome(user);
    return user;
  }
}
```

## File Organization

### Logical Grouping
- Group by feature or domain, not by type
- Example: `user/service.ts`, `user/repository.ts`, `user/types.ts`
- Not: `services/user.ts`, `repositories/user.ts`

### Consistent Structure
- Follow project conventions for directory layout
- Keep similar modules organized similarly
- Use index files to expose public APIs
