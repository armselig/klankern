/**
 * Unit tests for families service
 *
 * These tests use withTestTransaction() to test business logic
 * without E2E complexity or HTTP mocking.
 */

import { describe, expect, it } from "vitest";
import { eq, and } from "drizzle-orm";
import { withTestTransaction } from "#test/utils/db";
import { createTestUser } from "#test/utils/fixtures";
import { createFamily } from "#server/services/families";
import { families, familyMembers } from "#server/db/schema";
import { UnauthorizedError } from "#server/lib/errors";

describe("Families Service", () => {
    describe("createFamily", () => {
        it("should create a family with the creator as manager", async () => {
            await withTestTransaction(async (tx) => {
                // Arrange
                const user = await createTestUser(tx);
                const familyData = { name: "Test Family" };

                // Act
                const family = await createFamily(tx, user.id, familyData);

                // Assert - verify returned family
                expect(family).toBeDefined();
                expect(family.name).toBe("Test Family");
                expect(family.creator_id).toBe(user.id);
                expect(family.id).toBeDefined();

                // Assert - verify family was inserted in database
                const dbFamily = await tx.query.families.findFirst({
                    where: eq(families.id, family.id),
                });
                expect(dbFamily).toBeDefined();
                expect(dbFamily?.name).toBe("Test Family");
                expect(dbFamily?.creator_id).toBe(user.id);

                // Assert - verify creator was added as manager
                const membership = await tx.query.familyMembers.findFirst({
                    where: and(
                        eq(familyMembers.family_id, family.id),
                        eq(familyMembers.user_id, user.id),
                    ),
                });
                expect(membership).toBeDefined();
                expect(membership?.role).toBe("manager");
            });
        });

        it("should throw UnauthorizedError when userId is not provided", async () => {
            await withTestTransaction(async (tx) => {
                // Arrange
                const familyData = { name: "Test Family" };

                // Act & Assert
                await expect(createFamily(tx, "", familyData)).rejects.toThrow(
                    UnauthorizedError,
                );
            });
        });

        it("should create families with different names for the same user", async () => {
            await withTestTransaction(async (tx) => {
                // Arrange
                const user = await createTestUser(tx);

                // Act - create two families
                const family1 = await createFamily(tx, user.id, {
                    name: "Family One",
                });
                const family2 = await createFamily(tx, user.id, {
                    name: "Family Two",
                });

                // Assert
                expect(family1.id).not.toBe(family2.id);
                expect(family1.name).toBe("Family One");
                expect(family2.name).toBe("Family Two");

                // Verify both families have the user as manager
                const memberships = await tx.query.familyMembers.findMany({
                    where: eq(familyMembers.user_id, user.id),
                });
                expect(memberships).toHaveLength(2);
                expect(memberships.every((m) => m.role === "manager")).toBe(
                    true,
                );
            });
        });

        it("should handle family names with special characters", async () => {
            await withTestTransaction(async (tx) => {
                // Arrange
                const user = await createTestUser(tx);
                const familyData = { name: "O'Brien-Smith Family & Co." };

                // Act
                const family = await createFamily(tx, user.id, familyData);

                // Assert
                expect(family.name).toBe("O'Brien-Smith Family & Co.");

                const dbFamily = await tx.query.families.findFirst({
                    where: eq(families.id, family.id),
                });
                expect(dbFamily?.name).toBe("O'Brien-Smith Family & Co.");
            });
        });

        it("should create family with proper timestamps", async () => {
            await withTestTransaction(async (tx) => {
                // Arrange
                const user = await createTestUser(tx);
                const familyData = { name: "Test Family" };

                // Act
                const family = await createFamily(tx, user.id, familyData);

                // Assert - timestamps should be set
                expect(family.created_at).toBeDefined();
                expect(family.updated_at).toBeDefined();
                expect(family.created_at).toBeInstanceOf(Date);
                expect(family.updated_at).toBeInstanceOf(Date);
            });
        });

        it("should allow multiple users to create families with the same name", async () => {
            await withTestTransaction(async (tx) => {
                // Arrange
                const user1 = await createTestUser(tx);
                const user2 = await createTestUser(tx);
                const familyData = { name: "Smith Family" };

                // Act
                const family1 = await createFamily(tx, user1.id, familyData);
                const family2 = await createFamily(tx, user2.id, familyData);

                // Assert
                expect(family1.id).not.toBe(family2.id);
                expect(family1.name).toBe("Smith Family");
                expect(family2.name).toBe("Smith Family");
                expect(family1.creator_id).toBe(user1.id);
                expect(family2.creator_id).toBe(user2.id);
            });
        });
    });
});
