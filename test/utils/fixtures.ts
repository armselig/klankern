import { users, families, familyMembers } from "~~/server/db/schema";
import type { TestTransaction } from "./db";

// User Fixture
export async function createTestUser(
    tx: TestTransaction,
    userData: Partial<typeof users.$inferInsert> = {},
) {
    const timestamp = Date.now();
    const defaultUser: typeof users.$inferInsert = {
        email: `test-${timestamp}@example.com`,
        username: `testuser${timestamp}`,
        password: "hashedpassword", // Use a fixed hash for tests
        display_name: "Test User",
        ...userData,
    };
    const [user] = await tx.insert(users).values(defaultUser).returning();
    return user;
}

// Family Fixture
export async function createTestFamily(
    tx: TestTransaction,
    ownerId: string,
    familyData: Partial<typeof families.$inferInsert> = {},
) {
    const defaultFamily: typeof families.$inferInsert = {
        name: "The Test Family",
        creator_id: ownerId,
        ...familyData,
    };
    const [family] = await tx
        .insert(families)
        .values(defaultFamily)
        .returning();

    // Automatically create the owner's membership
    await tx.insert(familyMembers).values({
        family_id: family.id,
        user_id: ownerId,
        role: "manager",
    });

    return family;
}
