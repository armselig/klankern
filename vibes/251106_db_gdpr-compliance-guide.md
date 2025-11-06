# GDPR Compliance Implementation Guide

This document provides implementation guidance for GDPR compliance features in the Klankern application.

## Overview

The General Data Protection Regulation (GDPR) requires applications serving EU users to provide specific data protection and user rights features. This guide covers the database schema changes and implementation patterns for GDPR compliance.

## Database Schema

### User Anonymization Field

The `users` table includes an `anonymized_at` timestamp field to track when a user's data was anonymized.

```typescript
// Schema field
anonymized_at: timestamp("anonymized_at")
```

### User Consents Table

The `user_consents` table tracks user consent for various data processing purposes.

```typescript
export const userConsents = pgTable("user_consents", {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    user_id: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    consent_type: text("consent_type").notNull(), // 'marketing', 'analytics', 'data_processing', etc.
    granted: boolean("granted").notNull(),
    granted_at: timestamp("granted_at").notNull().defaultNow(),
    revoked_at: timestamp("revoked_at"),
});
```

## Implementation Features

### 1. User Anonymization (Right to be Forgotten)

**Purpose:** Allow users to request deletion of their personal data while maintaining referential integrity.

**Schema Considerations:**
- `failed_login_attempts` should be validated to be non-negative in application logic
- `locked_until` should be validated to be greater than `last_failed_login_at` when both are set
- These validations ensure data integrity for security features

**Implementation:**

```typescript
// server/utils/gdpr/anonymize-user.ts
import { db } from "#server/db";
import { users } from "#server/db/schema";
import { eq, sql } from "drizzle-orm";

export async function anonymizeUser(userId: string): Promise<void> {
    await db
        .update(users)
        .set({
            email: `deleted-${userId}@example.com`,
            username: `deleted-${userId}`,
            first_name: null,
            last_name: null,
            display_name: "Deleted User",
            password: "ANONYMIZED", // Invalid password hash
            anonymized_at: sql`now()`,
        })
        .where(eq(users.id, userId));
}
```

**Usage:**
- Call when user requests account deletion
- Preserves audit trail by keeping user ID
- Maintains referential integrity with related tables
- Makes user data unidentifiable

### 2. Consent Management

**Purpose:** Track and manage user consent for various data processing activities.

**Implementation:**

```typescript
// server/utils/gdpr/consent-management.ts
import { db } from "#server/db";
import { userConsents } from "#server/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export type ConsentType = 'marketing' | 'analytics' | 'data_processing' | 'third_party_sharing';

export async function grantConsent(userId: string, consentType: ConsentType): Promise<void> {
    await db.insert(userConsents).values({
        user_id: userId,
        consent_type: consentType,
        granted: true,
    });
}

export async function revokeConsent(userId: string, consentType: ConsentType): Promise<void> {
    const now = new Date();
    await db
        .update(userConsents)
        .set({ 
            granted: false, 
            revoked_at: now,
            // Note: granted_at remains unchanged to preserve when consent was originally granted
        })
        .where(
            and(
                eq(userConsents.user_id, userId),
                eq(userConsents.consent_type, consentType),
                isNull(userConsents.revoked_at)
            )
        );
}

export async function hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await db.query.userConsents.findFirst({
        where: (consents, { and, eq, isNull }) =>
            and(
                eq(consents.user_id, userId),
                eq(consents.consent_type, consentType),
                eq(consents.granted, true),
                isNull(consents.revoked_at)
            ),
    });
    return !!consent;
}
```

### 3. Data Export (Right to Data Portability)

**Purpose:** Allow users to export all their personal data in a machine-readable format.

**Implementation:**

```typescript
// server/api/users/export-data.get.ts
import { db } from "#server/db";
import { 
    users, 
    sessions, 
    corkboardPosts, 
    familyMembers, 
    families,
    userConsents 
} from "#server/db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    const session = await getUserSession(event);
    
    if (!session?.user?.id) {
        throw createError({
            statusCode: 401,
            message: "Unauthorized",
        });
    }

    const userId = session.user.id;

    // Gather all user data
    const userData = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            password: false, // Excluded for security - password hashes are not personal data under GDPR
        },
    });

    const userSessions = await db.query.sessions.findMany({
        where: eq(sessions.userId, userId),
    });

    const userPosts = await db.query.corkboardPosts.findMany({
        where: eq(corkboardPosts.userId, userId),
    });

    const userFamilies = await db.query.familyMembers.findMany({
        where: eq(familyMembers.user_id, userId),
        with: {
            family: true,
        },
    });

    const userConsentRecords = await db.query.userConsents.findMany({
        where: eq(userConsents.user_id, userId),
    });

    // Compile complete data export
    const dataExport = {
        personal_information: userData,
        sessions: userSessions,
        posts: userPosts,
        families: userFamilies,
        consents: userConsentRecords,
        export_date: new Date().toISOString(),
    };

    // Return as JSON
    setHeader(event, "Content-Type", "application/json");
    setHeader(
        event,
        "Content-Disposition",
        `attachment; filename="user-data-${userId}-${Date.now()}.json"`
    );

    return dataExport;
});
```

### 4. Consent UI Component

**Purpose:** Provide user interface for managing consent preferences.

**Implementation Pattern:**

```vue
<!-- app/components/consent-manager.vue -->
<template>
  <div class="consent-manager">
    <h2>Privacy Settings</h2>
    
    <div class="consent-option">
      <label>
        <input 
          type="checkbox" 
          v-model="consents.marketing"
          @change="updateConsent('marketing')"
        />
        Marketing Communications
      </label>
      <p>Receive updates about new features and promotions</p>
    </div>

    <div class="consent-option">
      <label>
        <input 
          type="checkbox" 
          v-model="consents.analytics"
          @change="updateConsent('analytics')"
        />
        Analytics
      </label>
      <p>Help us improve by sharing usage analytics</p>
    </div>

    <!-- Additional consent types -->
  </div>
</template>

<script setup lang="ts">
// Implementation would use API calls to manage consents
</script>
```

## GDPR Rights Implementation Checklist

### Right to Access
- [x] Data export API endpoint
- [ ] User dashboard showing personal data
- [ ] API documentation for data access

### Right to Rectification
- [ ] User profile edit functionality
- [ ] Data update audit logging
- [ ] Validation for data changes

### Right to Erasure (Right to be Forgotten)
- [x] User anonymization function
- [ ] Deletion request workflow
- [ ] Admin approval process (if required)
- [ ] Cascade deletion handling

### Right to Data Portability
- [x] JSON export format
- [ ] Consider additional formats (CSV, XML)
- [ ] Include all user-generated content

### Right to Restrict Processing
- [x] Consent management system
- [ ] Processing restriction flags
- [ ] Conditional data processing logic

### Right to Object
- [x] Consent revocation mechanism
- [ ] Opt-out of specific processing activities
- [ ] Marketing unsubscribe functionality

## Compliance Requirements

### Data Retention
- Implement automated data deletion after retention period
- See: `vibes/251106_db_data-retention-and-partitioning.md`

### Privacy by Design
- Minimize data collection
- Pseudonymization where possible
- Encryption for sensitive data

### Breach Notification
- Audit logging captures security events
- Session metadata tracks suspicious activity
- Failed login tracking for security monitoring

### Consent Requirements
- Explicit consent for each processing purpose
- Easy consent withdrawal
- Granular consent options
- Record of consent history

## API Endpoints to Implement

### Required Endpoints
1. `POST /api/users/request-deletion` - Request account anonymization
2. `GET /api/users/export-data` - Export all user data (implemented above)
3. `GET /api/users/consents` - Get current consent status
4. `POST /api/users/consents` - Update consent preferences
5. `GET /api/users/data-summary` - Get overview of stored data

### Admin Endpoints
1. `GET /api/admin/gdpr/deletion-requests` - View pending deletion requests
2. `POST /api/admin/gdpr/approve-deletion/:userId` - Approve deletion request
3. `GET /api/admin/gdpr/audit-log/:userId` - View user audit trail

## Testing

### Test Cases
1. User anonymization preserves referential integrity
2. Consent changes are tracked with timestamps
3. Data export includes all user data
4. Anonymized users cannot log in
5. Consent revocation prevents related processing

### Sample Test

```typescript
// test/nuxt/api/gdpr/anonymization.spec.ts
import { describe, it, expect } from "vitest";
import { anonymizeUser } from "#server/utils/gdpr/anonymize-user";
import { db } from "#server/db";
import { users } from "#server/db/schema";
import { eq } from "drizzle-orm";

describe("User Anonymization", () => {
    it("should anonymize user data", async () => {
        const userId = "test-user-id";
        
        await anonymizeUser(userId);
        
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });
        
        expect(user?.email).toBe(`deleted-${userId}@example.com`);
        expect(user?.username).toBe(`deleted-${userId}`);
        expect(user?.first_name).toBeNull();
        expect(user?.last_name).toBeNull();
        expect(user?.anonymized_at).not.toBeNull();
    });
});
```

## Documentation Requirements

### Privacy Policy
- Document what data is collected
- Explain how data is used
- Detail data retention periods
- Provide contact information for data requests

### Terms of Service
- User rights under GDPR
- Data processing purposes
- Third-party data sharing (if any)

### User Documentation
- How to export data
- How to request deletion
- How to manage consent preferences
- How to contact data protection officer

## Resources

- GDPR Official Text: https://gdpr.eu/
- GDPR Developer Guide: https://gdpr.eu/developers/
- ICO Guide (UK): https://ico.org.uk/for-organisations/guide-to-data-protection/
- PostgreSQL Encryption: https://www.postgresql.org/docs/current/encryption-options.html

## Next Steps

1. Implement API endpoints for data export, deletion, and consent management
2. Create user interface for privacy settings and data management
3. Add automated tests for GDPR features
4. Document privacy policy and terms of service
5. Set up data retention automation
6. Consider implementing encryption for sensitive fields
7. Establish data breach notification procedures
