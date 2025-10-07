import { vi } from "vitest";

vi.mock("#server/db", () => ({
    db: {
        query: {
            users: {
                findMany: vi.fn(),
                findFirst: vi.fn(),
            },
            roles: {
                findFirst: vi.fn(),
            },
        },
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn(),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        transaction: vi.fn(),
    },
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
