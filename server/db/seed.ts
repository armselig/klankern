import { db } from "#server/db";
import { users, roles } from "#server/db/schema"; // Import roles table
import bcrypt from "bcryptjs";
import { logger } from "#server/utils/logger";

async function seed() {
    logger.info("Starting database seeding...");

    const email = "test@example.com";
    const password = "password123"; // This password will be hashed
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        // 1. Check for and/or insert 'admin' role
        let adminRole = await db.query.roles.findFirst({
            where: (roles, { eq }) => eq(roles.name, "admin"),
        });

        if (!adminRole) {
            logger.info(
                "Admin role not found. Inserting default admin role...",
            );
            const [newRole] = await db
                .insert(roles)
                .values({
                    name: "admin",
                    description: "Administrator role with full access",
                })
                .returning();
            adminRole = newRole;
            logger.info(`Admin role inserted with ID: ${adminRole.id}`);
        } else {
            logger.info(`Admin role already exists with ID: ${adminRole.id}`);
        }

        if (!adminRole) {
            logger.error(
                "Failed to get or create admin role. Cannot seed user.",
            );
            process.exit(1);
        }

        // 2. Check if the user already exists to prevent duplicates
        const existingUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, email),
        });

        if (existingUser) {
            logger.info(
                `User with email ${email} already exists. Skipping insertion.`,
            );
            return;
        }

        // 3. Insert the test user with the admin roleId
        await db.insert(users).values({
            id: crypto.randomUUID(), // Generate a UUID for the user ID
            email,
            passwordHash: hashedPassword,
            roleId: adminRole.id, // Assign the admin role ID
            dashboardConfig: {}, // Default empty dashboard config
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        logger.info(`Successfully seeded user: ${email} with role: admin`);
    } catch (error) {
        logger.error("Error during database seeding:", error);
        process.exit(1); // Exit with an error code
    } finally {
        logger.info("Database seeding finished.");
        process.exit(0); // Exit successfully
    }
}

seed();
