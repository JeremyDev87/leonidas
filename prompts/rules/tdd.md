# Test-Driven Development (TDD)

## Purpose
Write tests before implementation to ensure code correctness and maintainability.

## Red-Green-Refactor Cycle

### 1. Red: Write a Failing Test
- Write a test that specifies the desired behavior
- Run the test and confirm it fails
- Ensures the test is actually testing something

### 2. Green: Make It Pass
- Write the minimal code needed to pass the test
- Don't worry about optimization yet
- Focus on correctness first

### 3. Refactor: Improve the Code
- Clean up the implementation
- Remove duplication
- Improve naming and structure
- Ensure tests still pass

## Test Organization

### Structure
Use `describe` blocks to group related tests:

```typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('returns user when ID exists', () => {
      // Arrange
      const userId = '123';

      // Act
      const user = getUserById(userId);

      // Assert
      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
    });

    it('throws error when ID does not exist', () => {
      expect(() => getUserById('invalid')).toThrow();
    });
  });
});
```

### Test Names
- Describe the behavior being verified
- Use "should" or simple present tense
- Be specific about conditions and outcomes

## Assertions Best Practices

### Be Specific
- Use the most specific matcher available
- `expect(value).toBe(true)` not `expect(value).toBeTruthy()`
- `expect(array).toHaveLength(3)` not `expect(array.length).toBe(3)`

### Test One Thing
- Each test should verify a single behavior
- Split complex tests into multiple smaller tests
- Easier to identify what broke when tests fail

### Arrange-Act-Assert Pattern
1. **Arrange:** Set up test data and conditions
2. **Act:** Execute the code being tested
3. **Assert:** Verify the expected outcome

## Edge Cases and Coverage

### Common Edge Cases
- Empty inputs (empty string, empty array, null, undefined)
- Boundary values (0, -1, MAX_INT, empty list)
- Invalid inputs (wrong type, out of range)
- Error conditions (network failure, file not found)

### Meaningful Coverage
- Aim for meaningful tests, not just coverage percentage
- Cover critical paths and business logic thoroughly
- Don't test implementation details
- Focus on behavior and contracts
