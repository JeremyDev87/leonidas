# SECURITY PATCH: Authorization Check for /approve Command

## ⚠️ CRITICAL - Manual Action Required

**Issue:** [#69] No authorization check on `/approve` command - allows any GitHub user to trigger code execution.

**Severity:** HIGH

## Required Changes

You **MUST** manually update `.github/workflows/leonidas-execute.yml` to add authorization checks.

### Step 1: Update leonidas-execute.yml

Open `.github/workflows/leonidas-execute.yml` and replace the `if` condition (lines 9-11) with:

```yaml
jobs:
  execute:
    if: |
      github.event.comment.body == '/approve' &&
      contains(github.event.issue.labels.*.name, 'leonidas') &&
      (
        github.event.comment.author_association == 'OWNER' ||
        github.event.comment.author_association == 'MEMBER' ||
        github.event.comment.author_association == 'COLLABORATOR'
      )
```

### Step 2: Verify the Change

After updating the workflow file:

1. Commit the change to your main/master branch
2. Test with an authorized user (OWNER/MEMBER/COLLABORATOR) - should work
3. Test with an unauthorized user - should be silently ignored

## Customizing Authorized Roles

The default authorized roles are:

- `OWNER` - Repository owner
- `MEMBER` - Organization member (for org-owned repos)
- `COLLABORATOR` - Direct repository collaborator

### Less Secure Options (Not Recommended)

You can add additional roles, but this reduces security:

```yaml
github.event.comment.author_association == 'CONTRIBUTOR' ||
```

**Warning:** Adding `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, `FIRST_TIMER`, `MANNEQUIN`, or `NONE` significantly reduces security and is **not recommended**.

## Configuration File

While `leonidas.config.yml` now includes an `authorized_approvers` field, it cannot be used directly in GitHub Actions workflow conditions due to platform limitations.

The config field serves to:

1. Document the security settings
2. Validate configuration consistency
3. Enable potential future enhancements

To keep your config file in sync with the workflow, update both files when changing authorization rules.

## Verification Checklist

- [ ] Updated `.github/workflows/leonidas-execute.yml` with authorization check
- [ ] Committed changes to main/master branch
- [ ] Tested with authorized user (works)
- [ ] Tested with unauthorized user (ignored)
- [ ] Updated `leonidas.config.yml` if using custom roles

## Why This is Manual

GitHub Actions workflows cannot read YAML config files in `if` conditions. This is a platform limitation that requires the authorization logic to be hardcoded in the workflow file.

GitHub Apps also cannot modify workflow files without the `workflows` permission, which is not granted by default for security reasons.

## Further Reading

- [GitHub author_association values](https://docs.github.com/en/graphql/reference/enums#commentauthorassociation)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idif)
