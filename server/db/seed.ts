import { db } from "./index";
import { users, roles, userRoles } from "./schema";
import { logger } from "../utils/logger";
import { customHashPassword } from "#server/utils/password";

async function seed() {
    logger.info("Starting database seeding...");

    const email = "test@example.com";
    const username = "admin";
    const password = "password123";
    const hashedPassword = await customHashPassword(password);

    try {
        // 1. Seed roles
        const roleData = [
            {
                name: "admin",
                description: "Administrator role with full access",
            },
            { name: "user", description: "Standard user role" },
        ];

        for (const role of roleData) {
            const existingRole = await db.query.roles.findFirst({
                where: (roles, { eq }) =>
                    eq(roles.name, role.name as "admin" | "user"),
            });
            if (!existingRole) {
                await db.insert(roles).values(role);
                logger.info(`Role '${role.name}' seeded.`);
            }
        }

        const adminRole = await db.query.roles.findFirst({
            where: (roles, { eq }) => eq(roles.name, "admin"),
        });

        if (!adminRole) {
            logger.error("Admin role not found after seeding. Exiting.");
            process.exit(1);
        }

        // 2. Check if the admin user already exists
        const existingUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, email),
        });

        if (existingUser) {
            logger.info(
                `User with email ${email} already exists. Skipping insertion.`,
            );
            return;
        }

        // 3. Insert the test user
        const [newUser] = await db
            .insert(users)
            .values({
                email,
                username,
                password: hashedPassword,
                display_name: "Test Admin",
                first_name: "Test",
                last_name: "Admin",
            })
            .returning();

        logger.info(`Successfully seeded user: ${newUser.email}`);

        // 4. Assign 'admin' role to the new user
        await db.insert(userRoles).values({
            userId: newUser.id,
            roleId: adminRole.id,
        });

        logger.info(`Assigned 'admin' role to user ${newUser.email}`);
    } catch (error) {
        logger.error("Error during database seeding:", error);
        process.exit(1);
    } finally {
        logger.info("Database seeding finished.");
    }
}

seed();
