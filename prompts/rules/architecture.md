# Architecture Principles

Follow these principles to maintain a clean, maintainable architecture.

## Dependency Direction

### Rule: Dependencies Point Inward

- High-level modules should not depend on low-level modules
- Both should depend on abstractions (interfaces)
- Abstractions should not depend on details

### Example

```
Business Logic → Interfaces ← I/O Layer
```

Business logic defines interfaces, I/O layer implements them.

## Layer Separation

### Keep Concerns Separate

- **Presentation**: UI, CLI, API endpoints
- **Business Logic**: Domain rules, validation, calculations
- **Data Access**: Database, file system, external APIs

### Benefits

- Easier to test (mock I/O layer)
- Easier to change (swap databases without touching business logic)
- Clearer code organization

## Single Responsibility

### Module Level

- Each module should have one reason to change
- Group related functions and types
- Avoid "God modules" that do everything

### Function Level

- Each function should do one thing well
- Keep functions focused and composable
- Extract complex operations into named functions

## File Organization

### Structure

```
src/
├── domain/         # Business logic, core types
├── services/       # Application services
├── adapters/       # External integrations
├── utils/          # Shared utilities
└── index.ts        # Entry point
```

### Guidelines

- Group by feature or domain, not by type
- Keep related code close together
- Avoid deep nesting (prefer flat structure)

## Dependency Injection

### Use for Testability

- Pass dependencies as parameters
- Avoid hard-coded dependencies (singletons, global state)
- Makes testing easier (inject mocks)

### Example

```typescript
// Good: Dependency injected
function processUser(user: User, repository: UserRepository): void {
  repository.save(user);
}

// Avoid: Hard-coded dependency
function processUser(user: User): void {
  const repository = new UserRepository();
  repository.save(user);
}
```

## Composition Over Inheritance

- Prefer composing small, focused functions
- Avoid deep inheritance hierarchies
- Use interfaces to define contracts
- Favor function composition over class hierarchies
