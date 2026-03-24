import { and, eq } from "drizzle-orm";
import { createError } from "h3";
import { db } from "#server/db";
import { familyInvitations, familyMembers } from "#server/db/schema";
import { notDeleted } from "#server/db/helpers";
import { logger } from "#server/utils/logger";

/** Drizzle transaction type extracted from the db instance. */
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface AcceptInvitationArgs {
    token: string;
    userId: string;
    email: string;
}

/**
 * Accepts a family invitation within an existing database transaction.
 * Extracted to allow reuse from both the registration flow and the
 * standalone accept endpoint without duplicating validation logic.
 *
 * @throws H3Error 400 INVITE_EXPIRED — token is expired or already used
 * @throws H3Error 400 INVITE_EMAIL_MISMATCH — invite was for a different email
 * @throws H3Error 404 — token not found or family soft-deleted
 */
export async function acceptInvitation(
    tx: DbTransaction,
    { token, userId, email }: AcceptInvitationArgs,
): Promise<{ familyId: string; familyName: string }> {
    const invitation = await tx.query.familyInvitations.findFirst({
        where: and(
            eq(familyInvitations.token, token),
            notDeleted(familyInvitations),
        ),
        with: {
            family: true,
        },
    });

    if (!invitation) {
        throw createError({
            statusCode: 404,
            statusMessage: "Invitation not found.",
        });
    }

    if (invitation.family.deleted_at) {
        throw createError({
            statusCode: 404,
            statusMessage:
                "The family associated with this invitation no longer exists.",
        });
    }

    if (invitation.status !== "pending") {
        throw createError({
            statusCode: 400,
            statusMessage:
                "This invite link is no longer valid. Ask the family member who sent it to send a new one.",
            data: { code: "INVITE_EXPIRED" },
        });
    }

    if (new Date() > invitation.expires_at) {
        throw createError({
            statusCode: 400,
            statusMessage:
                "This invite link has expired. Ask the family member who sent it to send a new one.",
            data: { code: "INVITE_EXPIRED" },
        });
    }

    if (invitation.invited_email !== email) {
        throw createError({
            statusCode: 400,
            statusMessage: "This invite was sent to a different email address.",
            data: { code: "INVITE_EMAIL_MISMATCH" },
        });
    }

    await tx.insert(familyMembers).values({
        family_id: invitation.family_id,
        user_id: userId,
        role: "member",
    });

    await tx
        .update(familyInvitations)
        .set({ status: "accepted" })
        .where(eq(familyInvitations.id, invitation.id));

    logger.info(
        `User ${userId} accepted invitation ${invitation.id} for family ${invitation.family_id}`,
    );

    return {
        familyId: invitation.family_id,
        familyName: invitation.family.name,
    };
}
