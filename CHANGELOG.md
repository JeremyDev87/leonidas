# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Two-phase workflow:** Plan generation phase followed by approval-gated execution phase
- **Sub-issue decomposition:** Automatic decomposition of complex issues into smaller sub-issues with native GitHub sub-issue linking
- **Internationalization (i18n):** Support for 8 languages (English, Korean, Japanese, Chinese, Spanish, German, French, Portuguese) in plan comments and status messages
- **YAML configuration system:** Repository-level configuration via `leonidas.config.yml` with customizable trigger labels, model selection, branch prefixes, base branch, turn budgets, language preferences, and authorization controls
- **Custom rules system:** Load project-specific guidelines from `.github/leonidas-rules/` directory to enforce coding standards, plan quality, architecture patterns, TDD practices, and security requirements
- **Turn budget management:** Configurable `max_turns` limit (default: 50) with partial progress rescue on failures
- **Authorization controls:** Restrict `/approve` command to repository maintainers (configurable via `authorized_approvers` in config file)
- **Automatic PR post-processing:** Add labels and assignees to generated pull requests based on issue metadata
- **CI trigger on PR branches:** Automatic CI workflow trigger on created PR branches to validate changes
- **Sub-issue tracking workflow:** Monitor sub-issue completion and post parent issue notifications when all sub-issues are closed
- **Runtime type validation:** Validate YAML configuration structure using Zod schemas
- **Codecov integration:** Automatic test coverage reporting in CI pipeline
- **Issue template:** Structured GitHub issue template for Leonidas requests with auto-applied labels
- **System prompt customization:** Configure custom system prompt path via `system_prompt_path` input
- **Rules path customization:** Configure custom rules directory path via `rules_path` input
- **Post-processing CLI:** Standalone CLI entry point for sub-issue linking, PR post-processing, failure handling, and CI triggering operations
- **5 bundled rule templates:** Pre-built rules for plan quality standards, coding conventions, TDD guidelines, architecture principles, and security checks

### Fixed

- Use portable `grep -oE` instead of `grep -oP` for cross-platform compatibility
- Add runtime authorization check for execute mode to complement workflow-level checks (defense-in-depth)
- Use nullish coalescing operator for `RUNNER_TEMP` environment variable access
- Clean up temporary prompt files after action execution
- Resolve eslint and typecheck errors in test files and implementation code

### Security

- **Prompt injection defense:** Wrap all user-supplied content (issue titles and bodies) in XML delimiters (`<user-supplied-content>`) to prevent malicious instructions from overriding system behavior
- **Authorization workflow checks:** Validate `author_association` at workflow level to restrict `/approve` command to trusted users (requires manual application via `.github/SECURITY_PATCH.md`)
- **Runtime authorization validation:** Enforce `authorized_approvers` config at runtime for defense-in-depth protection
- **Configurable approver roles:** Restrict execution triggers to specific GitHub association roles (OWNER, MEMBER, COLLABORATOR by default)
