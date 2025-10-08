import nodemailer from "nodemailer";
import { logger } from "#server/utils/logger";

// Configuration for the email transporter is pulled from environment variables.
// This keeps sensitive credentials out of the source code.
const smtpConfig = {
    host: process.env.MAILERSEND_SMTP_HOST,
    port: parseInt(process.env.MAILERSEND_SMTP_PORT || "587", 10),
    secure: process.env.MAILERSEND_SMTP_SECURE === "true", // Use true for port 465, false for 587/2525
    auth: {
        user: process.env.MAILERSEND_SMTP_USER,
        pass: process.env.MAILERSEND_SMTP_PASS,
    },
};

// We create a single, reusable transporter object.
const transporter = nodemailer.createTransport(smtpConfig);

logger.info("Email transporter configured.");

interface SendInvitationEmailOptions {
    to: string;
    token: string;
    familyName: string;
    inviterName: string;
}

/**
 * Sends a family invitation email.
 * @param options - The details for the invitation email.
 * @param options.token - The invitation token to include in the email link.
 * @param options.familyName - The name of the family being invited to.
 * @param options.inviterName - The name of the person sending the invitation.
 * @param options.to - The recipient's email address.
 */
export async function sendInvitationEmail(options: SendInvitationEmailOptions) {
    const { to, token, familyName, inviterName } = options;

    // The base URL of the application should also be an environment variable.
    const appBaseUrl =
        process.env.NUXT_PUBLIC_APP_BASE_URL || "http://localhost:3000";
    const invitationUrl = `${appBaseUrl}/invitations/${token}`;

    const mailOptions = {
        from: `Klankern <${process.env.MAIL_FROM_ADDRESS}>`,
        to,
        subject: `You're invited to join the "${familyName}" family on Klankern`,
        text: `Hello,\n\n${inviterName} has invited you to join their family group, "${familyName}".\n\nClick the link below to accept:\n${invitationUrl}\n\nIf you were not expecting this, please ignore this email.\n\nThanks,\nThe Klankern Team`,
        html: `<p>Hello,</p><p>${inviterName} has invited you to join their family group, "<strong>${familyName}</strong>".</p><p><a href="${invitationUrl}">Click here to accept the invitation.</a></p><p>If you were not expecting this, please ignore this email.</p><p>Thanks,<br>The Klankern Team</p>`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(
            `Invitation email sent to ${to}. Message ID: ${info.messageId}`,
        );
        return info;
    } catch (error) {
        logger.error(`Failed to send invitation email to ${to}.`, { error });
        // Re-throw a generic error to avoid leaking implementation details to the client.
        throw new Error("Failed to send invitation email.");
    }
}
