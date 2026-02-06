# GitHub Scripts

This directory contains utility scripts for managing GitHub repository settings.

## Branch Protection Configuration

### configure-branch-protection.sh

Configures branch protection rules for the `main` branch to enforce CI checks before merge.

**Required status checks:**
- `lint` - ESLint and Prettier checks
- `typecheck` - TypeScript type checking
- `test` - Vitest test suite
- `build` - Production build verification
- `security` - npm audit for vulnerabilities

**Protection settings:**
- Requires branches to be up to date before merge
- Prevents force pushes to main
- Prevents branch deletion
- Does not require PR reviews (allows direct push for automation)

**Usage:**

```bash
# Requires GitHub CLI (gh) to be authenticated
cd .github/scripts
chmod +x configure-branch-protection.sh
./configure-branch-protection.sh
```

**Prerequisites:**
- GitHub CLI (`gh`) installed and authenticated
- Repository admin or maintain permissions
- At least one successful CI run to establish the status checks

**Manual configuration:**

If you prefer to configure branch protection via the GitHub UI:

1. Navigate to: Settings → Branches → Branch protection rules → Add rule
2. Branch name pattern: `main`
3. Check "Require status checks to pass before merging"
4. Check "Require branches to be up to date before merging"
5. Select status checks: `lint`, `typecheck`, `test`, `build`, `security`
6. Check "Do not allow bypassing the above settings"
7. Uncheck "Require a pull request before merging" (optional, for automation)
8. Save changes

**Note:** The first time the CI workflow runs with the new job structure, GitHub will recognize the job names (`lint`, `typecheck`, `test`, `build`, `security`) as available status checks. After that, they can be selected as required checks in branch protection rules.
