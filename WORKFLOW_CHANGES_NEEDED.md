# Workflow Changes Required

Due to GitHub App permissions, the following workflow file changes could not be automatically committed.
These changes need to be manually applied by a repository maintainer with appropriate permissions.

## .github/workflows/leonidas-plan.yml

Add the `language` input parameter to pass through `vars.LEONIDAS_LANGUAGE`:

```yaml
- name: Generate implementation plan
  uses: ./
  with:
    mode: plan
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    github_token: ${{ github.token }}
    language: ${{ vars.LEONIDAS_LANGUAGE }} # ADD THIS LINE
```

## .github/workflows/leonidas-execute.yml

Add the `language` input parameter to pass through `vars.LEONIDAS_LANGUAGE`:

```yaml
- name: Execute implementation
  uses: ./
  with:
    mode: execute
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    github_token: ${{ github.token }}
    language: ${{ vars.LEONIDAS_LANGUAGE }} # ADD THIS LINE
```

## Why These Changes Are Needed

These changes connect the GitHub Variables configuration (`vars.LEONIDAS_LANGUAGE`)
to the action inputs, allowing users to configure the language globally for their
repository or organization without modifying workflow files.

Without these changes, the language configuration will still work via:

1. Repository config file (`leonidas.config.yml`)
2. Direct action input (requires modifying workflow files)

But the recommended GitHub Variables approach won't function.
