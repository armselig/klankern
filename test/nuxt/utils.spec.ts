import { describe, it, expect } from "vitest";
import { withTestTransaction } from "#test/utils/db";
import { createTestUser, createTestFamily } from "#test/utils/fixtures";
import { db } from "~~/server/db";
import * as schema from "~~/server/db/schema";

describe("Test Utilities", () => {
    it("withTestTransaction should roll back the transaction", async () => {
        let userId: string;

        await withTestTransaction(async (tx) => {
            const newUser = await tx
                .insert(schema.users)
                .values({
                    username: `testuser${Date.now()}`,
                    email: `test-${Date.now()}@example.com`,
                    password: "password",
                })
                .returning();
            userId = newUser[0].id;
            const userInDb = await tx.query.users.findFirst({
                where: (users, { eq }) => eq(users.id, userId),
            });
            expect(userInDb).toBeDefined();
        });

        // Outside the transaction, the user should not exist
        const userAfterRollback = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, userId),
        });
        expect(userAfterRollback).toBeUndefined();
    });

    it("createTestUser should create a user", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);
            expect(user).toBeDefined();
            expect(user.display_name).toBe("Test User");
        });
    });

    it("createTestFamily should create a family and owner membership", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);
            const family = await createTestFamily(tx, user.id);
            expect(family).toBeDefined();
            expect(family.name).toBe("The Test Family");

            const member = await tx.query.familyMembers.findFirst({
                where: (members, { and, eq }) =>
                    and(
                        eq(members.family_id, family.id),
                        eq(members.user_id, user.id),
                    ),
            });
            expect(member).toBeDefined();
            expect(member?.role).toBe("manager");
        });
    });

    it("createTestUser should create unique users with timestamps", async () => {
        await withTestTransaction(async (tx) => {
            // Note: The actual loginAs() call requires the /api/test/login endpoint
            // to be available, which needs NODE_ENV=test in the Nuxt server.
            // For this unit test of the fixture utilities, we'll just test user creation.
            const user = await createTestUser(tx);
            expect(user).toBeDefined();
            expect(user.username).toMatch(/^testuser\d+\d+$/);
            expect(user.email).toMatch(/^test-\d+-\d+@example\.com$/);

            const userInDb = await tx.query.users.findFirst({
                where: (users, { eq }) => eq(users.id, user.id),
            });
            expect(userInDb).toBeDefined();
            expect(userInDb?.username).toBe(user.username);
        });
    });
});
