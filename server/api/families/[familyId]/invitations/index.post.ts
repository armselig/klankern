import { and, eq } from "drizzle-orm";
import {
    defineEventHandler,
    createError,
    readValidatedBody,
    getRouterParams,
} from "h3";
import { randomUUID } from "node:crypto";
import { db } from "#server/db";
import { familyInvitations, familyMembers, users } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { sendInvitationEmail } from "#server/utils/email-sender";
import { InvitationCreateSchema } from "~~/shared/types/invitation";
import { notDeleted } from "#server/db/helpers";
import { requireAuth } from "#server/utils/auth";

export default defineEventHandler(async (event) => {
    const { familyId } = await getRouterParams(event);
    const session = await requireAuth(event);
    const user = session.user;

    const parseResult = await readValidatedBody(event, (body) =>
        InvitationCreateSchema.safeParse(body),
    );

    if (!parseResult.success) {
        throw createError({ statusCode: 400, data: parseResult.error.issues });
    }

    const { email: invitedEmail } = parseResult.data;

    try {
        // 1. Authorize: Check if the current user is a manager of the family.
        const membership = await db.query.familyMembers.findFirst({
            where: and(
                eq(familyMembers.family_id, familyId),
                eq(familyMembers.user_id, user.id),
                notDeleted(familyMembers),
            ),
            with: {
                family: { columns: { name: true } },
            },
        });

        if (membership?.role !== "manager") {
            throw createError({ statusCode: 403, statusMessage: "Forbidden" });
        }

        // 2. Conflict Check: See if a user with this email is already in the family (and not soft-deleted).
        const existingMember = await db.query.users.findFirst({
            where: eq(users.email, invitedEmail),
            with: {
                familyMembers: {
                    where: and(
                        eq(familyMembers.family_id, familyId),
                        notDeleted(familyMembers),
                    ),
                },
            },
        });

        if (existingMember && existingMember.familyMembers.length > 0) {
            throw createError({
                statusCode: 409,
                statusMessage: "User is already a member of this family.",
            });
        }

        // 3. Create Invitation
        const token = randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days

        await db.insert(familyInvitations).values({
            family_id: familyId,
            invited_by_user_id: user.id,
            invited_email: invitedEmail,
            token,
            expires_at: expiresAt,
        });

        // 4. Send Email
        await sendInvitationEmail({
            to: invitedEmail,
            token,
            familyName: membership.family.name,
            inviterName: user.display_name || user.username,
        });

        event.node.res.statusCode = 201;
        return { message: "Invitation sent successfully." };
    } catch (error) {
        // Handle known conflict errors from our own createError calls
        if (
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
        ) {
            const potentialError = error as { statusCode: unknown };
            if (potentialError.statusCode === 409) {
                throw error;
            }
        }

        logger.error(
            `Error sending invitation for family ${familyId} by user ${user.id}:`,
            error,
        );
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
