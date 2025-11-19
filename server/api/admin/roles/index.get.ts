import { defineEventHandler } from "h3";
import { db } from "#server/db/index";
import { getAllRoles } from "#server/services/roles";
import { translateError } from "#server/lib/errors";
import { logger } from "#server/utils/logger";
import type { RoleResponse } from "#shared/types/role";

export default defineEventHandler(
    async (event): Promise<{ roles: RoleResponse[] }> => {
        logger.http(`${event.method} ${event.path}`);
        try {
            const allRoles = await getAllRoles(db, event.context.user?.id);
            return { roles: allRoles };
        } catch (error) {
            throw translateError(error);
        }
    },
);
