import { eq } from "drizzle-orm";
import { createError, defineEventHandler, getRouterParam } from "h3";
import { z } from "zod";
import { db } from "#server/db/index.ts";
import { roles } from "#server/db/schema.ts";
import { logger } from "#server/utils/logger";

const roleIdSchema = z.string().uuid();

export default defineEventHandler(
    async (event): Promise<{ message: string; role: RoleResponse }> => {
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

            const [deletedRole] = await db
                .delete(roles)
                .where(eq(roles.id, parsedRoleId.data))
                .returning();

            if (!deletedRole) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Role not found.",
                });
            }

            return { message: "Role deleted successfully.", role: deletedRole };
        } catch (error) {
            logger.error("Error deleting role:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to delete role.",
            });
        }
    },
);
