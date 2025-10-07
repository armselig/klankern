import { createError, defineEventHandler } from "h3";
import { db } from "#server/db/index.ts";
import { roles } from "#server/db/schema.ts";
import { logger } from "#server/utils/logger";

export default defineEventHandler(
    async (): Promise<{ roles: z.infer<typeof roleSchema>[] }> => {
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
