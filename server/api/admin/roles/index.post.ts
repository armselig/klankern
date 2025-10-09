import { createError, defineEventHandler, readBody } from "h3";
import { z } from "zod";
import { db } from "#server/db/index.ts";
import { roles } from "#server/db/schema.ts";
import { logger } from "#server/utils/logger";

export default defineEventHandler(
    async (event): Promise<{ role: RoleResponse }> => {
        logger.http(`${event.method} ${event.path}`);
        try {
            const body = await readBody(event);
            const newRoleData = createRoleSchema.parse(body);

            const [newRole] = await db
                .insert(roles)
                .values(newRoleData)
                .returning();

            if (!newRole) {
                throw createError({
                    statusCode: 500,
                    statusMessage: "Failed to create role.",
                });
            }

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
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to create role.",
            });
        }
    },
);
