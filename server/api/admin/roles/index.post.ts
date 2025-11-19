import { createError, defineEventHandler, readBody } from "h3";
import { z } from "zod";
import { db } from "#server/db/index";
import { logger } from "#server/utils/logger";
import { createRoleSchema, type RoleResponse } from "#shared/types/role";
import { createRole } from "#server/services/roles";
import { translateError } from "#server/lib/errors";

export default defineEventHandler(
    async (event): Promise<{ role: RoleResponse }> => {
        logger.http(`${event.method} ${event.path}`);
        try {
            const body = await readBody(event);
            const newRoleData = createRoleSchema.parse(body);

            const newRole = await createRole(
                db,
                event.context.user?.id,
                newRoleData,
            );

            return { role: newRole };
        } catch (error) {
            logger.error("Error creating role:", error);
            if (error instanceof z.ZodError) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Validation failed.",
                    data: error.issues,
                });
            }
            throw translateError(error);
        }
    },
);
