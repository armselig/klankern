import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
    users,
    families,
    familyMembers,
    roles,
    userRoles,
    familyInvitations,
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
        password: string;
    }>,
) {
    const timestamp = Date.now();
    const user = await createTestUser(tx, {
        email: options?.email || `${roleName}${timestamp}@example.com`,
        username: options?.username || `${roleName}${timestamp}`,
        password: options?.password || "hashedpassword",
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

/**
 * Create a family with multiple members in different roles
 *
 * @param tx - Test transaction
 * @param creator - User object with id who will be the family creator (accepts any object with an id property or a full user object)
 * @param options - Optional configuration for family and members
 * @returns Object containing the family and categorized members by role.
 *          Note: The returned arrays (members, managers, regularMembers) contain only
 *          the additional members created by this fixture. The creator is automatically
 *          added to the family as a manager by createTestFamily but is NOT included in
 *          these arrays.
 */
export async function createFamilyWithMembers(
    tx: TestTransaction,
    creator: { id: string },
    options?: {
        members?: number;
        managers?: number;
        name?: string;
    },
) {
    const family = await createTestFamily(tx, creator.id, {
        name: options?.name || `Test Family ${Date.now()}`,
    });

    const createdMembers: Array<{
        user: typeof users.$inferSelect;
        role: string;
    }> = [];

    // Add managers
    for (let i = 0; i < (options?.managers || 0); i++) {
        const manager = await createTestUser(tx);
        await tx.insert(familyMembers).values({
            family_id: family.id,
            user_id: manager.id,
            role: "manager",
        });
        createdMembers.push({ user: manager, role: "manager" });
    }

    // Add regular members
    for (let i = 0; i < (options?.members || 0); i++) {
        const member = await createTestUser(tx);
        await tx.insert(familyMembers).values({
            family_id: family.id,
            user_id: member.id,
            role: "member",
        });
        createdMembers.push({ user: member, role: "member" });
    }

    return {
        family,
        members: createdMembers,
        managers: createdMembers.filter((m) => m.role === "manager"),
        regularMembers: createdMembers.filter((m) => m.role === "member"),
    };
}

/**
 * Create a complex family with creator and multiple members for testing
 *
 * @param tx - Test transaction
 * @param options - Optional configuration for the family setup
 * @returns Object containing creator, family, and all members
 */
export async function createComplexFamily(
    tx: TestTransaction,
    options?: {
        name?: string;
        withManagers?: number;
        withMembers?: number;
    },
) {
    const creator = await createTestUser(tx);
    const result = await createFamilyWithMembers(tx, creator, {
        name: options?.name,
        managers: options?.withManagers ?? 1,
        members: options?.withMembers ?? 2,
    });

    return {
        creator,
        ...result,
    };
}

/**
 * Create a valid (unexpired, pending) family invitation for testing
 *
 * @param tx - Test transaction
 * @param familyId - ID of the family to invite to
 * @param invitedByUserId - ID of the user creating the invitation
 * @param options - Optional configuration for invitation
 * @returns The created invitation
 */
export async function createValidInvitation(
    tx: TestTransaction,
    familyId: string,
    invitedByUserId: string,
    options?: {
        invitedEmail?: string;
        expiresInDays?: number;
    },
) {
    const timestamp = Date.now();
    const invitedEmail =
        options?.invitedEmail || `invited-${timestamp}@example.com`;
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (options?.expiresInDays || 7));

    const [invitation] = await tx
        .insert(familyInvitations)
        .values({
            family_id: familyId,
            invited_by_user_id: invitedByUserId,
            invited_email: invitedEmail,
            token,
            expires_at: expiresAt,
            status: "pending",
        })
        .returning();

    return invitation;
}

/**
 * Create an expired family invitation for testing
 *
 * @param tx - Test transaction
 * @param familyId - ID of the family to invite to
 * @param invitedByUserId - ID of the user creating the invitation
 * @param options - Optional configuration for invitation
 * @returns The created expired invitation
 */
export async function createExpiredInvitation(
    tx: TestTransaction,
    familyId: string,
    invitedByUserId: string,
    options?: {
        invitedEmail?: string;
        expiredDaysAgo?: number;
    },
) {
    const timestamp = Date.now();
    const invitedEmail =
        options?.invitedEmail || `expired-${timestamp}@example.com`;
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() - (options?.expiredDaysAgo || 1));

    const [invitation] = await tx
        .insert(familyInvitations)
        .values({
            family_id: familyId,
            invited_by_user_id: invitedByUserId,
            invited_email: invitedEmail,
            token,
            expires_at: expiresAt,
            status: "pending",
        })
        .returning();

    return invitation;
}

/**
 * Create a used (accepted or declined) family invitation for testing
 *
 * @param tx - Test transaction
 * @param familyId - ID of the family to invite to
 * @param invitedByUserId - ID of the user creating the invitation
 * @param options - Optional configuration for invitation
 * @returns The created used invitation
 */
export async function createUsedInvitation(
    tx: TestTransaction,
    familyId: string,
    invitedByUserId: string,
    options?: {
        invitedEmail?: string;
        status?: "accepted" | "declined" | "expired" | "cancelled";
        expiresInDays?: number;
    },
) {
    const timestamp = Date.now();
    const invitedEmail =
        options?.invitedEmail || `used-${timestamp}@example.com`;
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (options?.expiresInDays || 7));
    const status = options?.status || "accepted";

    const [invitation] = await tx
        .insert(familyInvitations)
        .values({
            family_id: familyId,
            invited_by_user_id: invitedByUserId,
            invited_email: invitedEmail,
            token,
            expires_at: expiresAt,
            status,
        })
        .returning();

    return invitation;
}
