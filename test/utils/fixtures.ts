import { eq } from "drizzle-orm";
import {
    users,
    families,
    familyMembers,
    roles,
    userRoles,
} from "~~/server/db/schema";
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

/**
 * Create a user with admin role
 *
 * @param tx - Test transaction
 * @param options - Optional user creation options
 * @returns The created user with admin role assigned
 */
export async function createTestAdminUser(
    tx: TestTransaction,
    options?: Partial<{
        email: string;
        username: string;
        password: string;
    }>,
) {
    const timestamp = Date.now();
    const user = await createTestUser(tx, {
        email: options?.email || `admin${timestamp}@example.com`,
        username: options?.username || `admin${timestamp}`,
        password: options?.password || "password123",
    });

    // Find or create admin role
    let adminRole = await tx.query.roles.findFirst({
        where: eq(roles.name, "admin"),
    });

    if (!adminRole) {
        [adminRole] = await tx
            .insert(roles)
            .values({
                name: "admin",
                description: "Administrator role",
            })
            .returning();
    }

    // Assign admin role
    await tx.insert(userRoles).values({
        user_id: user.id,
        role_id: adminRole.id,
    });

    return user;
}

/**
 * Create a user with a specific role
 *
 * @param tx - Test transaction
 * @param roleName - Name of the role to assign to the user
 * @param options - Optional user creation options
 * @returns The created user with the specified role assigned
 */
export async function createTestUserWithRole(
    tx: TestTransaction,
    roleName: string,
    options?: Partial<{
        email: string;
        username: string;
    }>,
) {
    const timestamp = Date.now();
    const user = await createTestUser(tx, {
        email: options?.email || `${roleName}${timestamp}@example.com`,
        username: options?.username || `${roleName}${timestamp}`,
    });

    let role = await tx.query.roles.findFirst({
        where: eq(roles.name, roleName),
    });

    if (!role) {
        [role] = await tx
            .insert(roles)
            .values({
                name: roleName,
                description: `${roleName} role`,
            })
            .returning();
    }

    await tx.insert(userRoles).values({
        user_id: user.id,
        role_id: role.id,
    });

    return user;
}
