import {
    createError,
    defineEventHandler,
    type EventHandlerRequest,
    H3Error,
    type H3Event,
    readBody,
} from "h3";
import { z } from "zod";
import { setUserSession } from "#auth";
import { getUserWithRolesAndFamiliesByEmail } from "#server/db/utils";
import { logger } from "#server/utils/logger";
import { customVerifyPassword } from "#server/utils/password";

const loginCredentialsSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

/**
 * Login endpoint.
 *
 * Security note: returning differentiated USER_NOT_FOUND vs WRONG_PASSWORD
 * codes enables email enumeration by an attacker. This trade-off is acceptable
 * for a family app with no public attack surface, as the UX benefit (clear
 * error messages for legitimate users) outweighs the risk.
 */
export default defineEventHandler(
    async (event: H3Event<EventHandlerRequest>) => {
        logger.http(`${event.method} ${event.path}`);
        try {
            const body: z.infer<typeof loginCredentialsSchema> =
                await readBody(event);
            const { email, password } = loginCredentialsSchema.parse(body);

            const userResults = await getUserWithRolesAndFamiliesByEmail(email);

            if (!userResults || userResults.length === 0 || !userResults[0]) {
                throw createError({
                    statusCode: 401,
                    statusMessage: "No account found for this email.",
                    data: { code: "USER_NOT_FOUND" },
                });
            }

            const user = userResults[0];

            const userRolesData =
                user.roles &&
                user.roles.length > 0 &&
                user.roles[0]?.id !== null
                    ? user.roles
                    : [];

            logger.info(`Verifying password for user: ${user.email}`);

            const isPasswordValid = await customVerifyPassword(
                password,
                user.password,
            );

            if (!isPasswordValid) {
                throw createError({
                    statusCode: 401,
                    statusMessage: "Wrong password.",
                    data: { code: "WRONG_PASSWORD" },
                });
            }

            await setUserSession(event, {
                user: {
                    id: user.id,
                    email: user.email,
                    roles: userRolesData,
                    families: user.families ?? [],
                    emailVerified: user.email_verified ?? false,
                },
                loggedInAt: new Date(),
            });

            return { message: "Login successful" };
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                logger.debug("Validation failed for login credentials", {
                    error: error,
                });
                throw createError({
                    statusCode: 400,
                    statusMessage:
                        "Invalid input. Please check your credentials.",
                    data: error.issues,
                });
            }

            if (error instanceof H3Error) {
                throw error;
            }

            const errorToLog =
                error instanceof Error ? error : new Error(String(error));
            logger.error(
                `An unexpected error occurred during login: ${String(errorToLog.message)}`,
            );
            throw createError({
                statusCode: 500,
                statusMessage:
                    "An unexpected error occurred. Please try again later.",
            });
        }
    },
);
