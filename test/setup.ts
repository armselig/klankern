import { vi } from "vitest";

// Mock the email sender utility globally to prevent server re-initialization
export const mockSendInvitationEmail = vi.fn();
vi.mock("~/server/utils/email-sender", () => ({
    sendInvitationEmail: mockSendInvitationEmail,
}));

import type { EventHandler } from "h3"; // Added import for EventHandler

vi.mock("#imports", () => ({
    customHashPassword: vi.fn().mockResolvedValue("hashed_password"),
    customVerifyPassword: vi.fn().mockResolvedValue(true),
    defineEventHandler: vi.fn((handler: EventHandler): EventHandler => handler), // Explicitly typed handler and return type
    readBody: vi.fn(),
    createError: vi.fn(),
    setUserSession: vi.fn(),
}));
