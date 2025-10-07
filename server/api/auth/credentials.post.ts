import {
    createError,
    defineEventHandler,
    type EventHandlerRequest,
    H3Error,
    type H3Event,
    readBody,
} from "h3";
import { z } from "zod";
import { getUserWithRolesByEmail } from "#server/db/utils";
import { logger } from "#server/utils/logger";
import { customVerifyPassword } from "#server/utils/password";

const loginCredentialsSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

interface UserSession {
    user: {
        id: string;
        email: string;
        roles: Role[];
    };
    loggedInAt: Date;
}

export default defineEventHandler(
    async (event: H3Event<EventHandlerRequest>) => {
        try {
            const body: z.infer<typeof loginCredentialsSchema> =
                await readBody(event);
            const { email, password } = loginCredentialsSchema.parse(body);

            const userWithRoles: UserWithRoles[] | undefined =
                await getUserWithRolesByEmail(email);

            if (!userWithRoles || userWithRoles.length === 0) {
                throw createError({
                    statusCode: 401,
                    statusMessage: "Invalid credentials",
                });
            }

            const user: UserWithRoles = userWithRoles[0];
            const userRolesData: Role[] =
                user.roles && user.roles.length > 0 && user.roles[0].id !== null
                    ? user.roles
                    : [];

            logger.info(`Verifying password for user: ${user.email}`);

            const isPasswordValid: boolean = await customVerifyPassword(
                password,
                user.password,
            );

            if (!isPasswordValid) {
                throw createError({
                    statusCode: 401,
                    statusMessage: "Invalid credentials",
                });
            }

            await setUserSession(event, {
                user: {
                    id: user.id,
                    email: user.email,
                    roles: userRolesData,
                },
                loggedInAt: new Date(),
            } as UserSession);

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

            // If the error is a 401 error we created, just re-throw it
            if (error instanceof H3Error && error.statusCode === 401) {
                throw createError({
                    statusCode: error.statusCode,
                    statusMessage: error.statusMessage,
                    data: error.data,
                    name: error.name,
                    stack: error.stack,
                });
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
