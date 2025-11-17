import {
    defineEventHandler,
    createError,
    readValidatedBody,
    getRouterParams,
} from "h3";
import { db } from "#server/db";
import { sendInvitationEmail } from "#server/utils/email-sender";
import { InvitationCreateSchema } from "~~/shared/types/invitation";
import { requireAuth } from "#server/utils/auth";
import { createInvitation } from "#server/services/invitations";
import { translateError } from "#server/lib/errors";

export default defineEventHandler(async (event) => {
    // 1. Extract params and auth
    const { familyId } = await getRouterParams(event);
    const session = await requireAuth(event);
    const user = session.user;

    // 2. Validation
    const parseResult = await readValidatedBody(event, (body) =>
        InvitationCreateSchema.safeParse(body),
    );

    if (!parseResult.success) {
        throw createError({ statusCode: 400, data: parseResult.error.issues });
    }

    const { email: invitedEmail } = parseResult.data;

    // 3. Call service within transaction
    try {
        const invitation = await db.transaction(async (tx) => {
            return await createInvitation(
                tx,
                familyId,
                user.id,
                invitedEmail,
            );
        });

        // 4. Send email (external service, outside transaction)
        await sendInvitationEmail({
            to: invitedEmail,
            token: invitation.token,
            familyName: invitation.family_name,
            inviterName: user.display_name || user.username,
        });

        event.node.res.statusCode = 201;
        return { message: "Invitation sent successfully." };
    } catch (error) {
        throw translateError(error);
    }
});
