import { eq } from "drizzle-orm";
import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { z } from "zod";
import { db } from "#server/db/index.ts";
import { roles } from "#server/db/schema.ts";
import { logger } from "#server/utils/logger";

const roleIdSchema = z.string().uuid();

export default defineEventHandler(
    async (event): Promise<{ role: RoleResponse }> => {
        logger.http(`${event.method} ${event.path}`);
        try {
            const id = getRouterParam(event, "id");
            const parsedRoleId = roleIdSchema.safeParse(id);

            if (!parsedRoleId.success) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Invalid Role ID",
                    data: parsedRoleId.error.errors,
                });
            }

            const body = await readBody(event);
            const updatedRoleData = updateRoleSchema.parse(body);

            const [updatedRole] = await db
                .update(roles)
                .set(updatedRoleData)
                .where(eq(roles.id, parsedRoleId.data))
                .returning();

            if (!updatedRole) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Role not found or no changes made.",
                });
            }

            return { role: updatedRole };
        } catch (error) {
            logger.error("Error updating role:", error);
            if (error instanceof z.ZodError) {
                throw createError({
                    statusCode: 400,
                    statusMessage: "Validation failed.",
                    data: error.issues,
                });
            }
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to update role.",
            });
        }
    },
);
