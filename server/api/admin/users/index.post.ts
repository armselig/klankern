import { defineEventHandler, readValidatedBody } from "h3";
import { createUserFormSchema } from "#shared/types/user";
import { db } from "#server/db";
import { createUser } from "#server/services/users";
import { logger } from "#server/utils/logger";
import { translateError } from "#server/lib/errors";

export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);
    try {
        const body = await readValidatedBody(event, (body) =>
            createUserFormSchema.parse(body),
        );

        const newUser = await createUser(db, event.context.user?.id, body);

        logger.info(`User created: ${newUser.email}`);

        return newUser;
    } catch (error) {
        logger.error("Error creating user:", error);
        throw translateError(error);
    }
});
