# Test-Driven Development

Follow TDD principles to ensure code quality and correctness.

## Red-Green-Refactor Cycle

### 1. Red: Write a Failing Test

- Write a test for the desired behavior before implementation
- Run the test and verify it fails for the right reason
- Keep tests focused on one behavior at a time

### 2. Green: Make the Test Pass

- Write the simplest code that makes the test pass
- Don't worry about optimization or elegance yet
- Run the test and verify it passes

### 3. Refactor: Improve the Code

- Clean up implementation while keeping tests green
- Remove duplication and improve clarity
- Run tests after each refactor to ensure nothing broke

## Test Organization

### Structure

Use `describe` blocks to group related tests:

```typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('returns user when ID exists', () => { ... });
    it('throws error when ID does not exist', () => { ... });
  });
});
```

### Naming

- Test names should describe the behavior being verified
- Use "should" or present tense (e.g., "returns", "throws")
- Include the condition or context (e.g., "when ID exists")

## Assertions

### Be Specific

- Use precise matchers (e.g., `toEqual`, `toThrow`, `toContain`)
- Avoid generic checks like `toBeTruthy` when you can be more specific
- Test both success and failure paths

### Test One Thing

- Each test should verify one behavior
- Multiple assertions are fine if testing the same behavior
- Avoid complex test logic (if/else, loops)

## Edge Cases

Always test:

- **Empty inputs**: Empty strings, arrays, objects
- **Null/undefined**: Missing or null values
- **Boundaries**: Min/max values, array bounds
- **Invalid inputs**: Wrong types, negative numbers, malformed data
- **Error conditions**: Network failures, file not found, permission denied

## Test Coverage

- Aim for meaningful coverage, not just percentage targets
- Focus on business logic and complex functions
- Integration tests for critical user flows
- Unit tests for utility functions and algorithms
