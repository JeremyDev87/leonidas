# Contributing to Leonidas

Thank you for your interest in contributing to Leonidas! We value your time and effort in helping make this project better. This document provides guidelines for contributing to the project.

Please note that this project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please open an issue using our [bug report template](.github/ISSUE_TEMPLATE/bug_report.md). Include as much detail as possible:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Your environment (Node.js version, OS, etc.)
- Any relevant logs or error messages

### Suggesting Features

We welcome feature suggestions! Please use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and provide:

- A clear description of the feature
- The problem it solves
- Any alternative solutions you've considered
- Examples of how it would be used

### Code Contributions

Code contributions are always welcome! Whether it's fixing a bug, implementing a new feature, or improving documentation, we appreciate your help.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/leonidas.git
   cd leonidas
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js version: 20
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install

# Run tests to verify setup
npm test

# Run linter
npm run lint
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Type Checking

```bash
# Run TypeScript type checker
npm run typecheck
```

### Running Linter

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues where possible
npm run lint:fix
```

### Code Formatting

```bash
# Format all files
npm run format

# Check formatting without making changes
npm run format:check
```

## Coding Conventions

We follow strict coding conventions to maintain consistency across the codebase:

### File Naming

- Use **snake_case** for all file names
- Examples: `user_service.js`, `authentication_middleware.js`, `user_repository_test.js`

### Code Style

- Use **double quotes** for strings
- **Semicolons are required** at the end of statements
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility

### Architecture

This project uses a **pragmatic, module-based structure**:

- **Flat organization**: Modules are organized by function rather than layered architecture
- **Clear separation**: Each module handles a specific concern (config, GitHub API, prompts, etc.)
- **Testability**: Business logic is independent of frameworks and external dependencies

Project structure:

```
src/
  main.ts                  # Entry point (orchestrator)
  config.ts                # Configuration system
  github.ts                # GitHub API helpers
  i18n.ts                  # Internationalization
  types.ts                 # Type definitions
  prompts/                 # Prompt builders
  templates/               # Comment formatting
  utils/                   # Utility functions
```

### Testing

We follow **Test-Driven Development (TDD)**:

- Write tests **before** implementing features
- Maintain a minimum of **90% code coverage**
- Use **minimal mocking**: Only mock external dependencies (databases, APIs, etc.)
- Test business logic directly without unnecessary mocks
- Each test should be independent and repeatable

## Commit Message Guidelines

We use the [Conventional Commits](https://www.conventionalcommits.org/) format for commit messages:

### Format

```
<type>: <description>

[optional body]

[optional footer]
```

### Types

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation changes only
- `style:` - Code style changes (formatting, missing semicolons, etc.)
- `refactor:` - Code changes that neither fix bugs nor add features
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks, dependency updates, etc.

### Examples

```
feat: add user authentication endpoint

fix: resolve memory leak in connection pool

docs: update API documentation for user service

test: add integration tests for payment processing

refactor: simplify error handling in middleware

chore: upgrade dependencies to latest versions
```

## Pull Request Process

1. **Ensure all tests pass** with at least 90% coverage:

   ```bash
   npm run test:coverage
   ```

2. **Run the linter** and fix any issues:

   ```bash
   npm run lint:fix
   ```

3. **Update documentation** if your changes affect:
   - Public API
   - Configuration options
   - Installation or setup process
   - Usage examples

4. **Add an entry to CHANGELOG.md** under the "Unreleased" section following the [Keep a Changelog](https://keepachangelog.com/) format

5. **Create a pull request** with:
   - A clear title describing the change
   - A description explaining what changed and why
   - References to any related issues
   - Screenshots or examples if applicable

6. **Request review** from maintainers

7. **Address feedback** from reviewers promptly

8. **One approval required** from a maintainer before merge

### Pull Request Checklist

- [ ] Tests pass with 90%+ coverage
- [ ] Linter passes with no errors
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Commit messages follow Conventional Commits format
- [ ] Code follows project conventions
- [ ] No unnecessary dependencies added

## Testing

### TDD Approach

We require a Test-Driven Development approach:

1. **Write a failing test** that describes the desired behavior
2. **Implement the minimum code** to make the test pass
3. **Refactor** the code while keeping tests green
4. **Repeat** for the next piece of functionality

### Coverage Requirements

- **Minimum 90% code coverage** is required for all pull requests
- Focus on testing business logic and critical paths
- Edge cases and error handling should be thoroughly tested

### Mocking Guidelines

- **Minimize mocking**: Only mock external dependencies
- **Do mock**: Databases, external APIs, file system, network calls
- **Don't mock**: Business logic, domain entities, internal services
- Use real implementations or test doubles when possible

### Test Organization

Tests are colocated with source files using the `.test.ts` extension:

```
src/
  config.ts
  config.test.ts          # Test colocated with source
  main.ts
  main.test.ts
  prompts/
    plan.ts
    plan.test.ts
  integration.test.ts      # Integration tests also in src/
```

## Questions?

If you have questions or need help:

- Open a [GitHub Discussion](../../discussions)
- Create an issue with the `question` label
- Check existing issues and discussions for similar questions

Thank you for contributing to Leonidas!
