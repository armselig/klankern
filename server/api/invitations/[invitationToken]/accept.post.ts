import { defineEventHandler, createError, getRouterParams, H3Error } from "h3";
import { setUserSession } from "#auth";
import { db } from "#server/db";
import { logger } from "#server/utils/logger";
import { requireAuth } from "#server/utils/auth";
import { acceptInvitation } from "#server/utils/invitations";
import { getUserWithRolesAndFamiliesByEmail } from "#server/db/utils";

export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);
    const { invitationToken } = await getRouterParams(event);
    const session = await requireAuth(event);
    const user = session.user;

    if (!invitationToken) {
        throw createError({ statusCode: 400, statusMessage: "Invalid token" });
    }

    try {
        await db.transaction(async (tx) => {
            await acceptInvitation(tx, {
                token: invitationToken,
                userId: user.id,
                email: user.email,
            });
        });

        // Refresh session so client immediately sees updated families list
        const updated = await getUserWithRolesAndFamiliesByEmail(user.email);
        if (updated.length > 0 && updated[0]) {
            const u = updated[0];
            await setUserSession(event, {
                user: {
                    id: u.id,
                    email: u.email,
                    roles: u.roles ?? [],
                    families: u.families ?? [],
                    emailVerified: u.email_verified ?? false,
                },
                loggedInAt: new Date(),
            });
        }

        return { message: "Invitation accepted successfully." };
    } catch (error) {
        if (error instanceof H3Error) throw error;

        logger.error(`Error accepting invitation ${invitationToken}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
