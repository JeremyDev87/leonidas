# Test-Driven Development Guidelines

## Overview

Test-Driven Development (TDD) improves code quality by writing tests before implementation. This guide covers the TDD cycle, test organization, and best practices.

## Red-Green-Refactor Cycle

### 1. Red: Write a Failing Test

Write a test for the next small piece of functionality:

```javascript
describe("calculateTotal", () => {
  it("returns 0 for empty array", () => {
    const result = calculateTotal([]);
    expect(result).toBe(0);
  });
});
```

Run the test. It should fail because the function doesn't exist yet.

### 2. Green: Make It Pass

Write the simplest code to make the test pass:

```javascript
function calculateTotal(items) {
  return 0;
}
```

Run the test. It should pass.

### 3. Refactor: Improve the Code

Improve the implementation without changing behavior:

```javascript
function calculateTotal(items) {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

Add more tests and repeat the cycle.

## Test Organization

### Use Descriptive Names

Test names should describe the behavior being tested:

❌ **Bad:** `it('works', () => { })`
✅ **Good:** `it('returns 0 for empty array', () => { })`

### Group Related Tests

Use `describe` blocks to organize related tests:

```javascript
describe("UserService", () => {
  describe("getUserById", () => {
    it("returns user when ID exists", () => {});
    it("throws NotFoundError when ID does not exist", () => {});
  });

  describe("createUser", () => {
    it("creates user with valid data", () => {});
    it("throws ValidationError for invalid email", () => {});
  });
});
```

### Structure: Arrange-Act-Assert

Organize test code into three sections:

```javascript
it("calculates total correctly", () => {
  // Arrange: Set up test data
  const items = [{ price: 10 }, { price: 20 }];

  // Act: Execute the function
  const result = calculateTotal(items);

  // Assert: Verify the result
  expect(result).toBe(30);
});
```

## Assertion Best Practices

### Be Specific

Use the most specific assertion available:

❌ **Bad:** `expect(result).toBeTruthy()`
✅ **Good:** `expect(result).toBe(true)`

❌ **Bad:** `expect(items.length).toBeGreaterThan(0)`
✅ **Good:** `expect(items).toHaveLength(3)`

### Test One Thing

Each test should verify one behavior:

❌ **Bad:**

```javascript
it("user operations work", () => {
  const user = createUser(data);
  expect(user.name).toBe("Alice");

  updateUser(user.id, { name: "Bob" });
  expect(getUser(user.id).name).toBe("Bob");

  deleteUser(user.id);
  expect(getUser(user.id)).toBeNull();
});
```

✅ **Good:**

```javascript
it("creates user with provided name", () => {});
it("updates user name", () => {});
it("deletes user", () => {});
```

### Avoid Logic in Tests

Tests should be simple and obvious:

❌ **Bad:**

```javascript
it("processes items", () => {
  const items = [];
  for (let i = 0; i < 10; i++) {
    items.push({ id: i, price: i * 10 });
  }
  const result = processItems(items);
  expect(result.total).toBe(450);
});
```

✅ **Good:**

```javascript
it("processes items and calculates total", () => {
  const items = [
    { id: 1, price: 10 },
    { id: 2, price: 20 },
  ];
  const result = processItems(items);
  expect(result.total).toBe(30);
});
```

## Edge Cases and Error Handling

### Test Edge Cases

Cover boundary conditions:

```javascript
describe("divide", () => {
  it("divides positive numbers", () => {
    expect(divide(10, 2)).toBe(5);
  });

  it("handles division by zero", () => {
    expect(() => divide(10, 0)).toThrow("Division by zero");
  });

  it("handles negative numbers", () => {
    expect(divide(-10, 2)).toBe(-5);
  });

  it("handles decimals", () => {
    expect(divide(10, 3)).toBeCloseTo(3.333, 2);
  });
});
```

### Test Error Conditions

Verify that errors are thrown correctly:

```javascript
it("throws ValidationError for invalid email", () => {
  expect(() => {
    createUser({ email: "invalid" });
  }).toThrow(ValidationError);
});

it("includes helpful error message", () => {
  expect(() => {
    createUser({ email: "invalid" });
  }).toThrow("Email must contain @");
});
```

## Mocking and Isolation

### Mock External Dependencies

Isolate the unit under test:

```javascript
import { vi } from "vitest";
import * as database from "./database.js";

vi.mock("./database.js");

describe("UserService", () => {
  it("fetches user from database", async () => {
    vi.mocked(database.query).mockResolvedValue({ id: 1, name: "Alice" });

    const user = await getUserById(1);

    expect(user.name).toBe("Alice");
    expect(database.query).toHaveBeenCalledWith("SELECT * FROM users WHERE id = ?", [1]);
  });
});
```

### Don't Mock What You Don't Own

Mock your own modules, not external libraries:

❌ **Bad:** Mocking `bcrypt.hash()` to return a specific string
✅ **Good:** Mock your `hashPassword()` function that calls bcrypt

## Test Coverage

### Aim for Meaningful Coverage

Focus on testing behavior, not just hitting coverage targets:

- ✅ Test all code paths (if/else branches)
- ✅ Test edge cases and error conditions
- ✅ Test integration points between modules
- ❌ Don't test trivial getters/setters
- ❌ Don't test framework code or external libraries

### 90%+ Coverage Goal

Maintain high coverage while avoiding meaningless tests:

```bash
npm test -- --coverage
# Coverage should be 90% or higher
```
