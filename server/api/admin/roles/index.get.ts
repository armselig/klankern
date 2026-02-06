import { createError, defineEventHandler } from "h3";
import { db } from "#server/db/index";
import { roles } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { requireAdmin } from "#server/utils/auth";
import type { RoleResponse } from "#shared/types/role";

export default defineEventHandler(
    async (event): Promise<{ roles: RoleResponse[] }> => {
        logger.http(`${event.method} ${event.path}`);
        await requireAdmin(event);
        try {
            const allRoles = await db.select().from(roles);
            return { roles: allRoles };
        } catch (error) {
            logger.error("Error fetching roles:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch roles.",
            });
        }
    },
);
