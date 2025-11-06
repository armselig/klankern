import { customHashPassword } from "../utils/password";
import { logger } from "../utils/logger";
import { db } from "./index";
import { roles, userRoles, users } from "./schema";

async function seed() {
    logger.info("Starting database seeding...");

    try {
        // 1. Seed Roles
        logger.info("Seeding roles...");
        const roleData = [
            {
                name: "admin",
                description: "Administrator role with full access",
            },
            { name: "user", description: "Standard user role" },
        ];
        await db.insert(roles).values(roleData).onConflictDoNothing();

        const seededRoles = await db.query.roles.findMany();
        const adminRole = seededRoles.find((r) => r.name === "admin");
        const userRole = seededRoles.find((r) => r.name === "user");

        if (!adminRole || !userRole) {
            throw new Error("Admin or user role not found after seeding.");
        }

        // 2. Seed Admin User
        logger.info("Attempting to seed admin user...");
        await db
            .insert(users)
            .values({
                email: "admin@example.com",
                username: "admin",
                password: await customHashPassword("password123"),
                display_name: "Test Admin",
            })
            .onConflictDoNothing();

        // 3. Seed Standard User for E2E Testing
        logger.info("Attempting to seed standard test user...");
        const testUserId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"; // Predictable ID
        await db
            .insert(users)
            .values({
                id: testUserId,
                email: "user@example.com",
                username: "testuser",
                password: await customHashPassword("password123"),
                display_name: "Test User",
            })
            .onConflictDoNothing();

        // 4. Assign roles idempotently
        const adminUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.username, "admin"),
        });
        if (adminUser) {
            await db
                .insert(userRoles)
                .values({ user_id: adminUser.id, role_id: adminRole.id })
                .onConflictDoNothing();
        }

        const testUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, testUserId),
        });
        if (testUser) {
            await db
                .insert(userRoles)
                .values({ user_id: testUser.id, role_id: userRole.id })
                .onConflictDoNothing();
        }
    } catch (error) {
        logger.error("Error during database seeding:", error);
        process.exit(1);
    } finally {
        logger.info("Database seeding finished.");
    }
}

void seed();
