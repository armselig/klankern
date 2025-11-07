#!/usr/bin/env bash

# Script to apply all schema enhancements to feat/issue-18_db-security-audit-gdpr branch
# Run this from the repository root after checking out the target branch

set -e  # Exit on error

echo "🚀 Applying Database Schema Enhancements"
echo "========================================="
echo ""

# Check we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "feat/issue-18_db-security-audit-gdpr" ]; then
    echo "❌ Error: You must be on feat/issue-18_db-security-audit-gdpr branch"
    echo "   Current branch: $CURRENT_BRANCH"
    echo ""
    echo "Run: git checkout feat/issue-18_db-security-audit-gdpr"
    exit 1
fi

echo "✅ On correct branch: $CURRENT_BRANCH"
echo ""

# Step 1: Copy files from old PR branch
echo "📋 Step 1: Copying files from copilot/future-enhancements-db-schema..."
git checkout copilot/future-enhancements-db-schema -- shared/types/gdpr.ts
git checkout copilot/future-enhancements-db-schema -- test/nuxt/db/schema-enhancements.spec.ts
git checkout copilot/future-enhancements-db-schema -- .github/workflows/test.yml
git checkout copilot/future-enhancements-db-schema -- vibes/251106_db_data-retention-and-partitioning.md
git checkout copilot/future-enhancements-db-schema -- vibes/251106_db_gdpr-compliance-guide.md
git checkout copilot/future-enhancements-db-schema -- vibes/251106_db_schema-enhancements-summary.md
git checkout copilot/future-enhancements-db-schema -- vibes/251106_db_security-summary.md
git checkout copilot/future-enhancements-db-schema -- vibes/251107_db_code-review-response.md
git checkout copilot/future-enhancements-db-schema -- vibes/251107_db_testing-guide.md

echo "✅ Files copied"
echo ""

# Step 2: Apply schema changes
echo "📝 Step 2: Applying schema changes to server/db/schema.ts..."
echo "   This requires manual editing or applying the patch..."
echo ""
echo "   Required changes:"
echo "   1. Add 'integer' and 'uniqueIndex' to imports from drizzle-orm/pg-core"
echo "   2. Add audit enums (auditActionEnum, auditEntityTypeEnum)"
echo "   3. Add fields to users table (failed_login_attempts, last_failed_login_at, locked_until, anonymized_at)"
echo "   4. Add fields to sessions table (ip_address, user_agent, last_activity_at, device_fingerprint)"
echo "   5. Add auditLog table"
echo "   6. Add userConsents table"
echo "   7. Update usersRelations to include auditLogs and consents"
echo "   8. Add auditLogRelations"
echo "   9. Add userConsentsRelations"
echo ""

# Check if we should apply the schema patch
read -p "Do you want to apply schema.ts changes automatically? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Copy the updated schema from the old branch
    echo "   Copying updated schema.ts..."
    git checkout copilot/future-enhancements-db-schema -- server/db/schema.ts
    echo "✅ Schema updated"
else
    echo "⚠️  Skipped - please apply manually using APPLY_CHANGES_TO_NEW_BRANCH.md"
    echo "   After manual changes, run: pnpm run db:generate"
    exit 0
fi
echo ""

# Step 3: Generate migration
echo "🔨 Step 3: Generating database migration..."
pnpm run db:generate

echo "✅ Migration generated"
echo ""

# Step 4: Verify changes
echo "🔍 Step 4: Verifying changes..."
echo "   Running linter..."
pnpm run lint

echo "   Running type check..."
pnpm run typecheck

echo "✅ Verification complete"
echo ""

# Step 5: Show status
echo "📊 Step 5: Current status..."
git status

echo ""
echo "========================================="
echo "✅ All changes applied successfully!"
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff"
echo "2. Commit the changes: git add . && git commit -m \"feat(db): add schema enhancements for security, audit, and gdpr\""
echo "3. Push to GitHub: git push origin feat/issue-18_db-security-audit-gdpr"
echo "4. Create a Pull Request targeting develop"
echo ""
echo "For detailed commit message, see APPLY_CHANGES_TO_NEW_BRANCH.md"
