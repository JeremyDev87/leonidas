# Branch Protection Setup Guide

This guide explains how to configure post-execution validation for Leonidas PRs using branch protection rules.

## Overview

Leonidas's `execute` mode generates code changes and creates PRs automatically. To prevent broken code from being merged, we use **branch protection rules** that require all CI checks to pass before a PR can be merged.

This approach is simpler and more maintainable than adding validation steps directly in the workflow, because:
- CI logic stays in one place (`.github/workflows/ci.yml`)
- No duplication of validation commands
- GitHub automatically blocks PRs with failing checks
- Clear visual feedback on which checks failed

## Implementation Steps

### Step 1: Apply the Parallel CI Workflow

Since the GitHub App used by Leonidas doesn't have `workflows` permission, the CI workflow changes must be applied manually.

**Replace `.github/workflows/ci.yml` with the following content:**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Test
        run: npm test

  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Security audit
        run: npm audit --audit-level=moderate
```

Then commit and push:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: restructure workflow to run checks in parallel"
git push
```

**Alternative: Grant workflows permission to GitHub App**

If you have admin access, you can grant the `workflows` permission so Leonidas can modify workflow files in future PRs:

1. Go to: Settings → Integrations → GitHub Apps → Configure
2. Under "Repository permissions", set "Workflows" to "Read and write"
3. Save changes

### Step 2: Wait for First CI Run

After merging the parallel CI workflow:

1. The next PR (or push to main) will trigger the new workflow
2. GitHub will recognize the 5 job names as available status checks:
   - `lint`
   - `typecheck`
   - `test`
   - `build`
   - `security`

**Important:** Status checks must run at least once before they can be selected in branch protection rules.

### Step 3: Configure Branch Protection Rules

**Option A: Using the provided script**

If you have GitHub CLI (`gh`) installed and authenticated:

```bash
cd .github/scripts
chmod +x configure-branch-protection.sh
./configure-branch-protection.sh
```

**Option B: Manual configuration via GitHub UI**

1. Navigate to: **Settings** → **Branches** → **Branch protection rules**
2. Click **Add rule** (or edit existing rule for `main`)
3. Configure the following settings:

   **Branch name pattern:**
   - `main`

   **Protect matching branches:**
   - ✅ Require a pull request before merging (optional, see note below)
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Status checks that are required:
     - `lint`
     - `typecheck`
     - `test`
     - `build`
     - `security`
   - ❌ Require conversation resolution before merging (optional)
   - ❌ Do not allow bypassing the above settings (recommended)
   - ❌ Allow force pushes
   - ❌ Allow deletions

4. Click **Create** or **Save changes**

**Note on "Require a pull request before merging":**
- **Checked**: All changes (including from Leonidas automation) must go through PRs
- **Unchecked**: Allows direct pushes to `main` (useful for automation, hotfixes)
- **Recommendation**: Leave checked for better code review practices

### Step 4: Verify Configuration

Create a test PR to confirm the protection rules work:

1. Create a test branch:
   ```bash
   git checkout -b test-branch-protection
   echo "// test" >> src/main.ts
   git add src/main.ts
   git commit -m "test: verify branch protection"
   git push -u origin test-branch-protection
   ```

2. Create a PR and check that:
   - All 5 status checks appear in the PR
   - The PR cannot be merged until all checks pass
   - Each check shows individual status (pass/fail)

3. Clean up:
   ```bash
   git checkout main
   git branch -D test-branch-protection
   git push origin --delete test-branch-protection
   ```

## How It Works

### For Leonidas PRs

When Leonidas's `execute` mode creates a PR:

1. **PR Created** → Triggers CI workflow automatically
2. **CI Runs** → All 5 jobs run in parallel:
   - `lint`: ESLint + Prettier checks
   - `typecheck`: TypeScript compilation check
   - `test`: Vitest test suite
   - `build`: Production build with `@vercel/ncc`
   - `security`: `npm audit` for vulnerabilities
3. **Status Checks Report** → Each job reports pass/fail individually
4. **Branch Protection** → GitHub blocks merge if any check fails
5. **Clear Feedback** → PR shows which specific check failed

### For Manual PRs

The same validation applies to all PRs, ensuring consistent quality regardless of the author.

## Troubleshooting

### Status checks don't appear in protection rules

**Cause:** The checks haven't run yet on the main branch.

**Solution:** Merge a PR or push directly to `main` to trigger the workflow. After the first run, the check names will be available.

### PR created before checks complete

**Cause:** Leonidas creates the PR immediately after pushing code.

**Solution:** This is expected. The checks will run automatically after PR creation. The merge button will be disabled until checks pass.

### Security check fails on fresh dependencies

**Cause:** `npm audit` found vulnerabilities in dependencies.

**Solution:**
```bash
npm audit fix
npm audit fix --force  # if needed for breaking changes
```

Then commit the updated `package-lock.json`.

### Need to bypass protection temporarily

**Cause:** Emergency hotfix or one-time exception needed.

**Solution:**
- Repository admins can temporarily disable protection or use "Include administrators" exception
- Or push to a different branch and merge later after checks pass

## Maintenance

### Adding New Checks

To add a new required check:

1. Add the job to `.github/workflows/ci.yml`
2. Let it run once so GitHub recognizes it
3. Add it to branch protection rules (Settings → Branches → Edit rule)
4. Update this documentation

### Removing Checks

To remove a required check:

1. Remove it from branch protection rules first
2. Then remove it from `.github/workflows/ci.yml`
3. Update this documentation

## Additional Resources

- [GitHub: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub: About status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [GitHub CLI: Branch protection](https://cli.github.com/manual/gh_api)
