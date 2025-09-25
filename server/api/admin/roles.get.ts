import { defineEventHandler } from "h3";
import { db } from "#server/db/index.ts";
import { roles } from "#server/db/schema.ts";

export default defineEventHandler(async () => {
    try {
        const allRoles = await db.select().from(roles);
        return { roles: allRoles };
    } catch (error) {
        console.error("Error fetching roles:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch roles.",
        });
    }
});
