import { defineEventHandler, getRouterParam } from "h3";
import { db } from "#server/db/index.ts";
import { roles } from "#server/db/schema.ts";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, "id");

        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: "Role ID is required.",
            });
        }

        const [deletedRole] = await db
            .delete(roles)
            .where(eq(roles.id, id))
            .returning();

        if (!deletedRole) {
            throw createError({
                statusCode: 404,
                statusMessage: "Role not found.",
            });
        }

        return { message: "Role deleted successfully.", role: deletedRole };
    } catch (error) {
        console.error("Error deleting role:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete role.",
        });
    }
});
