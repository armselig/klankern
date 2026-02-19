import { createError, defineEventHandler } from "h3";
import { z } from "zod";
import { db } from "#server/db";
import { logger } from "#server/utils/logger";
import { requireAdmin } from "#server/utils/auth";
import { translateError } from "#server/lib/errors";
import { deleteFamily } from "#server/services/families";

const familyIdSchema = z.string().uuid("Invalid family ID format");

export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);
    await requireAdmin(event);

    const parsedFamilyId = familyIdSchema.safeParse(event.context.params?.id);

    if (!parsedFamilyId.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid family ID",
            data: parsedFamilyId.error.issues,
        });
    }

    try {
        const result = await deleteFamily(
            db,
            event.context.user?.id,
            parsedFamilyId.data,
        );

        return { message: "Family deleted successfully", id: result.id };
    } catch (error) {
        logger.error(
            `Error deleting family with ID ${parsedFamilyId.data}:`,
            error,
        );
        throw translateError(error);
    }
});
