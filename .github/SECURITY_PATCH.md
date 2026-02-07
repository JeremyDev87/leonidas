# SECURITY PATCH: Authorization Check for /approve Command

## ✅ APPLIED

**Issue:** [#69], [#108] No authorization check on `/approve` command - allows any GitHub user to trigger code execution.

**Severity:** HIGH

**Status:** Authorization checks have been applied at two levels:

1. **Workflow level:** `leonidas-execute.yml` `if` condition checks `author_association`
2. **Runtime level:** `src/main.ts` validates against `config.authorized_approvers` (defense-in-depth)

## Reference: Workflow Condition

The `leonidas-execute.yml` workflow uses this `if` condition:

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

## For Existing Users

If you installed Leonidas before this patch was applied, update your workflow file to match the condition above.

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

The `authorized_approvers` field in `leonidas.config.yml` is used by the runtime check in `src/main.ts`. The workflow-level `if` condition cannot read config files due to GitHub Actions limitations, so it hardcodes the default values.

To customize authorized roles, update both:

1. `leonidas.config.yml` — `authorized_approvers` field (used at runtime)
2. `.github/workflows/leonidas-execute.yml` — `if` condition (used at workflow level)

## Further Reading

- [GitHub author_association values](https://docs.github.com/en/graphql/reference/enums#commentauthorassociation)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idif)
