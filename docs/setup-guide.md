# Leonidas Setup Guide

Step-by-step instructions for installing Leonidas in your repository.

## Prerequisites

- A GitHub repository
- An [Anthropic API key](https://console.anthropic.com/)

## Installation

### Step 1: Copy Workflow Files

Copy the following files into your repository's `.github/workflows/` directory:

- `plan.yml` - Triggers when an issue with the `leonidas` label is created
- `execute.yml` - Triggers when `/approve` is commented on a planned issue

You can download them from the [Leonidas repository](https://github.com/JeremyDev87/leonidas/tree/main/.github/workflows).

### Step 2: Copy System Prompt

Copy `.github/leonidas.md` to your repository. This file contains the coding guidelines and rules that Claude follows when analyzing and implementing code.

Customize it to match your project's conventions:
- Commit message format
- Code style preferences
- Testing requirements
- Security guidelines

### Step 3: Set API Key

Add your Anthropic API key as a repository secret:

1. Go to your repository **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Anthropic API key
5. Click **Add secret**

### Step 4: (Optional) Add Configuration File

Create `leonidas.config.yml` in your repository root to customize behavior:

```yaml
# Trigger label name
label: "leonidas"

# Claude model to use
model: "claude-sonnet-4-5-20250929"

# Branch name prefix for PRs
branch_prefix: "claude/issue-"

# Base branch for PRs
base_branch: "main"

# Maximum Claude Code turns
max_turns: 30

# Plan comment language
language: "en"
```

### Step 5: (Optional) Add Issue Template

Copy `.github/ISSUE_TEMPLATE/leonidas-request.yml` to your repository. This provides a structured form for creating Leonidas requests with the label auto-applied.

## Configuration Reference

| Option | Default | Description |
|--------|---------|-------------|
| `label` | `leonidas` | Issue label that triggers the workflow |
| `model` | `claude-sonnet-4-5-20250929` | Claude model for analysis and implementation |
| `branch_prefix` | `claude/issue-` | Prefix for implementation branches |
| `base_branch` | `main` | Target branch for pull requests |
| `allowed_tools` | (see config file) | Tools Claude can use during execution |
| `max_turns` | `30` | Maximum API round-trips per workflow run |
| `language` | `en` | Language for plan comments |

## Troubleshooting

### Workflow doesn't trigger
- Verify the issue has the `leonidas` label
- Check that `ANTHROPIC_API_KEY` is set in repository secrets
- Ensure workflow files are in the default branch (usually `main`)

### Plan comment is empty or incomplete
- Check the workflow run logs for errors
- Increase `max_turns` if the repository is large
- Ensure the repository is checked out with `fetch-depth: 0`

### PR creation fails
- Verify the workflow has `contents: write` and `pull-requests: write` permissions
- Check that the base branch exists
- Ensure there are no branch protection rules blocking the workflow

### `/approve` doesn't trigger execution
- The comment must be exactly `/approve` (no extra text)
- The issue must still have the `leonidas` label
- A plan comment must exist on the issue
