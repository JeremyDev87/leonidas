#!/bin/bash
# Script to configure branch protection rules for the main branch
# Requires GH_TOKEN environment variable or gh cli to be authenticated

set -e

REPO_OWNER="${REPO_OWNER:-$(gh repo view --json owner -q .owner.login)}"
REPO_NAME="${REPO_NAME:-$(gh repo view --json name -q .name)}"

echo "Configuring branch protection for ${REPO_OWNER}/${REPO_NAME}:main"

# Configure branch protection rules
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/${REPO_OWNER}/${REPO_NAME}/branches/main/protection" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=lint" \
  -f "required_status_checks[contexts][]=typecheck" \
  -f "required_status_checks[contexts][]=test" \
  -f "required_status_checks[contexts][]=build" \
  -f "required_status_checks[contexts][]=security" \
  -f "enforce_admins=false" \
  -f "required_pull_request_reviews=null" \
  -f "restrictions=null" \
  -f "allow_force_pushes=false" \
  -f "allow_deletions=false" \
  -f "block_creations=false" \
  -f "required_conversation_resolution=false" \
  -f "lock_branch=false" \
  -f "allow_fork_syncing=false"

echo "✓ Branch protection rules configured successfully"
echo ""
echo "Required status checks:"
echo "  - lint"
echo "  - typecheck"
echo "  - test"
echo "  - build"
echo "  - security"
echo ""
echo "Protection settings:"
echo "  - Require branches to be up to date: true"
echo "  - Allow force pushes: false"
echo "  - Allow deletions: false"
