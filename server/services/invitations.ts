import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { familyInvitations, familyMembers, users } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";
import { ForbiddenError, ConflictError } from "#server/lib/errors";
import { logger } from "#server/utils/logger";
import { notDeleted } from "#server/db/helpers";

/**
 * Creates a family invitation.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param familyId - ID of the family
 * @param invitedByUserId - ID of the user sending the invitation
 * @param invitedEmail - Email address to invite
 * @returns Invitation details (token, expires_at, family_name)
 * @throws {ForbiddenError} If inviting user is not a manager
 * @throws {ConflictError} If invited email is already a member
 */
export async function createInvitation(
    dbConnection: DbConnection,
    familyId: string,
    invitedByUserId: string,
    invitedEmail: string,
) {
    // 1. Authorize: Check if the current user is a manager of the family
    const membership = await dbConnection.query.familyMembers.findFirst({
        where: and(
            eq(familyMembers.family_id, familyId),
            eq(familyMembers.user_id, invitedByUserId),
            notDeleted(familyMembers),
        ),
        with: {
            family: { columns: { name: true } },
        },
    });

    if (membership?.role !== "manager") {
        throw new ForbiddenError(
            "Only managers can invite members to the family",
        );
    }

    // 2. Conflict Check: See if a user with this email is already in the family
    const existingMember = await dbConnection.query.users.findFirst({
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
        throw new ConflictError("User is already a member of this family");
    }

    // 3. Create Invitation
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days

    await dbConnection.insert(familyInvitations).values({
        family_id: familyId,
        invited_by_user_id: invitedByUserId,
        invited_email: invitedEmail,
        token,
        expires_at: expiresAt,
    });

    logger.info(
        `Invitation created for family ${familyId} by user ${invitedByUserId} to ${invitedEmail}`,
    );

    return {
        token,
        expires_at: expiresAt,
        family_name: membership.family.name,
    };
}
