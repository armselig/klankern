import { eq } from "drizzle-orm";
import { createError, defineEventHandler, H3Error, readBody } from "h3";
import { setUserSession } from "#auth";
import { db } from "#server/db";
import { users } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { customHashPassword } from "#server/utils/password";
import { acceptInvitation } from "#server/utils/invitations";
import { RegisterBodySchema } from "#shared/types/auth";

/**
 * Public registration endpoint.
 * Handles two paths:
 * - Cold signup (no inviteToken): creates user, sets empty families in session
 * - Invite signup (inviteToken present): creates user + accepts invite atomically
 *
 * Security note: USER_NOT_FOUND vs WRONG_PASSWORD differentiation on login is
 * a user enumeration trade-off acceptable for a family app with no public attack surface.
 */
export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);

    const body = await readBody(event);
    const parsed = RegisterBodySchema.safeParse(body);

    if (!parsed.success) {
        throw createError({
            statusCode: 422,
            statusMessage: "Validation failed.",
            data: parsed.error.issues,
        });
    }

    const { name, email, password, inviteToken } = parsed.data;

    // Check for duplicate email before opening a transaction
    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: { id: true },
    });

    if (existingUser) {
        throw createError({
            statusCode: 409,
            statusMessage: "An account with this email already exists.",
            data: { code: "EMAIL_TAKEN" },
        });
    }

    const hashedPassword = await customHashPassword(password);
    const emailPrefix = email
        .split("@")[0]!
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase()
        .slice(0, 46); // Leave room for 4-digit suffix within 50 char limit

    let userId: string | undefined;
    let sessionFamilies: Array<{ id: string; name: string }> = [];

    try {
        await db.transaction(async (tx) => {
            // Generate a unique username: {email-prefix}{4-random-digits}
            let username: string | undefined;
            for (let attempt = 0; attempt < 3; attempt++) {
                const suffix = String(Math.floor(1000 + Math.random() * 9000));
                const candidate = `${emailPrefix}${suffix}`;
                const taken = await tx.query.users.findFirst({
                    where: eq(users.username, candidate),
                    columns: { id: true },
                });
                if (!taken) {
                    username = candidate;
                    break;
                }
            }

            if (!username) {
                throw createError({
                    statusCode: 500,
                    statusMessage:
                        "Could not generate a unique username. Please try again.",
                });
            }

            const [newUser] = await tx
                .insert(users)
                .values({
                    email,
                    username,
                    display_name: name,
                    password: hashedPassword,
                    email_verified: false,
                })
                .returning({ id: users.id });

            if (!newUser) {
                throw createError({
                    statusCode: 500,
                    statusMessage: "User creation failed.",
                });
            }

            userId = newUser.id;

            if (inviteToken) {
                const { familyId, familyName } = await acceptInvitation(tx, {
                    token: inviteToken,
                    userId: userId,
                    email,
                });
                sessionFamilies = [{ id: familyId, name: familyName }];
            }
        });
    } catch (error) {
        if (error instanceof H3Error) throw error;
        logger.error("Registration transaction failed:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Registration failed. Please try again.",
        });
    }

    await setUserSession(event, {
        user: {
            id: userId!,
            email,
            roles: [],
            families: sessionFamilies,
            emailVerified: false,
        },
        loggedInAt: new Date(),
    });

    logger.info(`User registered: ${userId}`);

    return {
        userId: userId!,
        ...(sessionFamilies.length > 0
            ? { familyId: sessionFamilies[0]!.id }
            : {}),
    };
});
