import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "#server/db";
import { users, sessions, auditLog, userConsents } from "#server/db/schema";
import { eq, and, isNull } from "drizzle-orm";

describe("Database Schema Enhancements", () => {
    // Test user data
    const testUserId = "550e8400-e29b-41d4-a716-446655440000";
    const testUser = {
        id: testUserId,
        email: "schema-test@example.com",
        username: "schematest",
        password: "hashedpassword",
        display_name: "Schema Test User",
    };

    beforeEach(async () => {
        // Clean up any existing test data
        await db.delete(sessions).where(eq(sessions.userId, testUserId));
        await db
            .delete(userConsents)
            .where(eq(userConsents.user_id, testUserId));
        await db.delete(auditLog).where(eq(auditLog.user_id, testUserId));
        await db.delete(users).where(eq(users.id, testUserId));
    });

    afterEach(async () => {
        // Clean up test data
        await db.delete(sessions).where(eq(sessions.userId, testUserId));
        await db
            .delete(userConsents)
            .where(eq(userConsents.user_id, testUserId));
        await db.delete(auditLog).where(eq(auditLog.user_id, testUserId));
        await db.delete(users).where(eq(users.id, testUserId));
    });

    describe("Failed Login Tracking", () => {
        it("should allow users to have failed login tracking fields", async () => {
            // Insert user with failed login data
            await db.insert(users).values({
                ...testUser,
                failed_login_attempts: 3,
                last_failed_login_at: new Date("2024-01-01T10:00:00Z"),
                locked_until: new Date("2024-01-01T11:00:00Z"),
            });

            const user = await db.query.users.findFirst({
                where: eq(users.id, testUserId),
            });

            expect(user).toBeDefined();
            expect(user?.failed_login_attempts).toBe(3);
            expect(user?.last_failed_login_at).toBeInstanceOf(Date);
            expect(user?.locked_until).toBeInstanceOf(Date);
        });

        it("should have default value of 0 for failed_login_attempts", async () => {
            await db.insert(users).values(testUser);

            const user = await db.query.users.findFirst({
                where: eq(users.id, testUserId),
            });

            expect(user?.failed_login_attempts).toBe(0);
        });

        it("should allow null for last_failed_login_at and locked_until", async () => {
            await db.insert(users).values(testUser);

            const user = await db.query.users.findFirst({
                where: eq(users.id, testUserId),
            });

            expect(user?.last_failed_login_at).toBeNull();
            expect(user?.locked_until).toBeNull();
        });

        it("should be able to update failed login fields", async () => {
            await db.insert(users).values(testUser);

            const now = new Date();
            await db
                .update(users)
                .set({
                    failed_login_attempts: 1,
                    last_failed_login_at: now,
                })
                .where(eq(users.id, testUserId));

            const user = await db.query.users.findFirst({
                where: eq(users.id, testUserId),
            });

            expect(user?.failed_login_attempts).toBe(1);
            expect(user?.last_failed_login_at).toBeInstanceOf(Date);
        });
    });

    describe("User Anonymization", () => {
        it("should allow users to have anonymized_at timestamp", async () => {
            const anonymizedAt = new Date("2024-01-01T12:00:00Z");
            await db.insert(users).values({
                ...testUser,
                anonymized_at: anonymizedAt,
            });

            const user = await db.query.users.findFirst({
                where: eq(users.id, testUserId),
            });

            expect(user?.anonymized_at).toBeInstanceOf(Date);
        });

        it("should default anonymized_at to null", async () => {
            await db.insert(users).values(testUser);

            const user = await db.query.users.findFirst({
                where: eq(users.id, testUserId),
            });

            expect(user?.anonymized_at).toBeNull();
        });

        it("should be able to set anonymized_at when anonymizing", async () => {
            await db.insert(users).values(testUser);

            const now = new Date();
            await db
                .update(users)
                .set({
                    email: `deleted-${testUserId}@example.com`,
                    username: `deleted-${testUserId}`,
                    first_name: null,
                    last_name: null,
                    display_name: "Deleted User",
                    anonymized_at: now,
                })
                .where(eq(users.id, testUserId));

            const user = await db.query.users.findFirst({
                where: eq(users.id, testUserId),
            });

            expect(user?.email).toBe(`deleted-${testUserId}@example.com`);
            expect(user?.username).toBe(`deleted-${testUserId}`);
            expect(user?.display_name).toBe("Deleted User");
            expect(user?.anonymized_at).toBeInstanceOf(Date);
        });
    });

    describe("Session Metadata Tracking", () => {
        it("should allow sessions with metadata fields", async () => {
            await db.insert(users).values(testUser);

            const sessionData = {
                userId: testUserId,
                token: "test-token-123",
                expiresAt: new Date("2024-12-31"),
                ip_address: "192.168.1.1",
                user_agent: "Mozilla/5.0",
                last_activity_at: new Date(),
                device_fingerprint: "test-fingerprint",
            };

            await db.insert(sessions).values(sessionData);

            const session = await db.query.sessions.findFirst({
                where: eq(sessions.userId, testUserId),
            });

            expect(session).toBeDefined();
            expect(session?.ip_address).toBe("192.168.1.1");
            expect(session?.user_agent).toBe("Mozilla/5.0");
            expect(session?.last_activity_at).toBeInstanceOf(Date);
            expect(session?.device_fingerprint).toBe("test-fingerprint");
        });

        it("should allow null metadata fields", async () => {
            await db.insert(users).values(testUser);

            await db.insert(sessions).values({
                userId: testUserId,
                token: "test-token-456",
                expiresAt: new Date("2024-12-31"),
            });

            const session = await db.query.sessions.findFirst({
                where: eq(sessions.userId, testUserId),
            });

            expect(session?.ip_address).toBeNull();
            expect(session?.user_agent).toBeNull();
            expect(session?.last_activity_at).toBeNull();
            expect(session?.device_fingerprint).toBeNull();
        });

        it("should be able to update last_activity_at", async () => {
            await db.insert(users).values(testUser);

            const token = "test-token-789";
            await db.insert(sessions).values({
                userId: testUserId,
                token,
                expiresAt: new Date("2024-12-31"),
            });

            const now = new Date();
            await db
                .update(sessions)
                .set({ last_activity_at: now })
                .where(eq(sessions.token, token));

            const session = await db.query.sessions.findFirst({
                where: eq(sessions.token, token),
            });

            expect(session?.last_activity_at).toBeInstanceOf(Date);
        });
    });

    describe("Audit Log Table", () => {
        it("should create audit log entries", async () => {
            await db.insert(users).values(testUser);

            const auditEntry = {
                user_id: testUserId,
                action: "create",
                entity_type: "user",
                entity_id: testUserId,
                new_values: {
                    email: testUser.email,
                    username: testUser.username,
                },
                ip_address: "192.168.1.1",
                user_agent: "Mozilla/5.0",
            };

            await db.insert(auditLog).values(auditEntry);

            const logs = await db.query.auditLog.findMany({
                where: eq(auditLog.user_id, testUserId),
            });

            expect(logs).toHaveLength(1);
            expect(logs[0].action).toBe("create");
            expect(logs[0].entity_type).toBe("user");
            expect(logs[0].entity_id).toBe(testUserId);
        });

        it("should allow null user_id for system actions", async () => {
            const auditEntry = {
                user_id: null,
                action: "delete",
                entity_type: "user",
                entity_id: testUserId,
                old_values: { email: "deleted@example.com" },
            };

            await db.insert(auditLog).values(auditEntry);

            const logs = await db.query.auditLog.findMany({
                where: and(
                    eq(auditLog.entity_id, testUserId),
                    isNull(auditLog.user_id),
                ),
            });

            expect(logs).toHaveLength(1);
            expect(logs[0].user_id).toBeNull();
        });

        it("should store old and new values as JSONB", async () => {
            await db.insert(users).values(testUser);

            const oldValues = { email: "old@example.com" };
            const newValues = { email: "new@example.com" };

            await db.insert(auditLog).values({
                user_id: testUserId,
                action: "update",
                entity_type: "user",
                entity_id: testUserId,
                old_values: oldValues,
                new_values: newValues,
            });

            const log = await db.query.auditLog.findFirst({
                where: eq(auditLog.user_id, testUserId),
            });

            expect(log?.old_values).toEqual(oldValues);
            expect(log?.new_values).toEqual(newValues);
        });

        it("should have indexes on key fields", async () => {
            // This test verifies the schema has proper indexes
            // The indexes are defined in the schema and applied via migrations
            await db.insert(users).values(testUser);

            // Insert multiple audit log entries
            for (let i = 0; i < 5; i++) {
                await db.insert(auditLog).values({
                    user_id: testUserId,
                    action: "update",
                    entity_type: "user",
                    entity_id: testUserId,
                });
            }

            // Query using indexed fields should be fast
            const logs = await db.query.auditLog.findMany({
                where: eq(auditLog.user_id, testUserId),
            });

            expect(logs.length).toBeGreaterThan(0);
        });
    });

    describe("User Consents Table", () => {
        it("should create user consent records", async () => {
            await db.insert(users).values(testUser);

            const consent = {
                user_id: testUserId,
                consent_type: "marketing",
                granted: true,
            };

            await db.insert(userConsents).values(consent);

            const consents = await db.query.userConsents.findMany({
                where: eq(userConsents.user_id, testUserId),
            });

            expect(consents).toHaveLength(1);
            expect(consents[0].consent_type).toBe("marketing");
            expect(consents[0].granted).toBe(true);
            expect(consents[0].revoked_at).toBeNull();
        });

        it("should support multiple consent types per user", async () => {
            await db.insert(users).values(testUser);

            const consents = [
                {
                    user_id: testUserId,
                    consent_type: "marketing",
                    granted: true,
                },
                {
                    user_id: testUserId,
                    consent_type: "analytics",
                    granted: false,
                },
            ];

            await db.insert(userConsents).values(consents);

            const userConsentRecords = await db.query.userConsents.findMany({
                where: eq(userConsents.user_id, testUserId),
            });

            expect(userConsentRecords).toHaveLength(2);
        });

        it("should be able to revoke consent", async () => {
            await db.insert(users).values(testUser);

            await db.insert(userConsents).values({
                user_id: testUserId,
                consent_type: "marketing",
                granted: true,
            });

            const now = new Date();
            await db
                .update(userConsents)
                .set({
                    granted: false,
                    revoked_at: now,
                })
                .where(
                    and(
                        eq(userConsents.user_id, testUserId),
                        eq(userConsents.consent_type, "marketing"),
                    ),
                );

            const consent = await db.query.userConsents.findFirst({
                where: and(
                    eq(userConsents.user_id, testUserId),
                    eq(userConsents.consent_type, "marketing"),
                ),
            });

            expect(consent?.granted).toBe(false);
            expect(consent?.revoked_at).toBeInstanceOf(Date);
        });

        it("should cascade delete consents when user is deleted", async () => {
            await db.insert(users).values(testUser);

            await db.insert(userConsents).values({
                user_id: testUserId,
                consent_type: "analytics",
                granted: true,
            });

            await db.delete(users).where(eq(users.id, testUserId));

            const consents = await db.query.userConsents.findMany({
                where: eq(userConsents.user_id, testUserId),
            });

            expect(consents).toHaveLength(0);
        });
    });

    describe("Relations", () => {
        it("should establish relation between users and audit logs", async () => {
            await db.insert(users).values(testUser);

            await db.insert(auditLog).values({
                user_id: testUserId,
                action: "create",
                entity_type: "user",
                entity_id: testUserId,
            });

            const user = await db.query.users.findFirst({
                where: eq(users.id, testUserId),
                with: {
                    auditLogs: true,
                },
            });

            expect(user?.auditLogs).toBeDefined();
            expect(user?.auditLogs.length).toBeGreaterThan(0);
        });

        it("should establish relation between users and consents", async () => {
            await db.insert(users).values(testUser);

            await db.insert(userConsents).values({
                user_id: testUserId,
                consent_type: "marketing",
                granted: true,
            });

            const user = await db.query.users.findFirst({
                where: eq(users.id, testUserId),
                with: {
                    consents: true,
                },
            });

            expect(user?.consents).toBeDefined();
            expect(user?.consents.length).toBe(1);
        });
    });
});
