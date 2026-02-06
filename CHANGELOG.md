# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-02-06

### Added

#### Core Features
- Two-phase workflow: plan generation and execution with explicit user approval via `/approve` comment
- Automatic plan generation when issues are labeled with configurable trigger label (default: `leonidas`)
- Atomic commits with clear step-by-step implementation progress
- Automatic pull request creation with issue references (`Closes #N`)
- Sub-issue decomposition for complex issues that exceed turn limits
- Sub-issue dependency tracking and execution blocking until dependencies are resolved
- Parent issue checklist tracking for multi-sub-issue workflows
- Turn budget management with configurable `max_turns` limit (default: 50)
- Partial progress rescue: automatic draft PR creation when turn limit is reached
- Scope constraints to keep sub-issues focused on their defined objectives

#### Configuration
- Configuration system via `leonidas.config.yml` with support for:
  - Custom trigger label
  - Claude model selection
  - Branch naming prefix
  - Base branch configuration
  - Maximum turn limit
  - Language localization
- System prompt customization via `.github/leonidas.md` for repository-specific coding conventions
- Example configuration and system prompt templates

#### GitHub Integration
- Composite GitHub Action for easy integration
- Three workflow files: plan, execute, and sub-issue tracking
- Support for GitHub PAT tokens to enable automatic sub-issue plan generation
- Automatic PR labeling and assignee assignment
- Git identity configuration for commits

#### Developer Experience
- Comprehensive issue template for feature requests
- PR template with structured sections
- Examples and dogfooding workflows demonstrating usage
- Detailed setup guide and documentation

### Infrastructure

#### Build & Development
- TypeScript codebase with strict mode enabled
- Runtime build system using @vercel/ncc
- Automatic bundling on workflow execution (no committed dist/)
- ESLint and Prettier configuration for code quality
- Type checking with `tsc --noEmit`

#### Testing
- Vitest test framework with 90% coverage threshold
- Comprehensive unit tests for all core modules:
  - Configuration system (`config.ts`)
  - GitHub API helpers (`github.ts`)
  - System prompt builder (`prompts/system.ts`)
  - Plan prompt builder (`prompts/plan.ts`)
  - Execute prompt builder (`prompts/execute.ts`)
  - Plan comment formatter (`templates/plan_comment.ts`)
  - Main orchestrator (`main.ts`)
  - Sub-issue utilities
- Test coverage reporting with UI and watch modes
- CI pipeline running tests on all pull requests

#### Dependency Management
- Renovate integration with automerge configuration
- Automated dependency updates for npm packages and GitHub Actions
- Node.js 20 requirement specified in `.nvmrc`, `package.json` engines, and documentation

#### Community
- MIT License
- Contributing guidelines with development setup instructions
- Code of Conduct
- Security policy
- Issue and PR templates
- GitHub issue template configuration
