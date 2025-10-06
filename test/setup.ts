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

vi.mock("#imports", () => ({
    hashPassword: vi.fn().mockResolvedValue("hashed_password"),
    verifyPassword: vi.fn().mockResolvedValue(true),
    defineEventHandler: vi.fn((handler) => handler),
    readBody: vi.fn(),
    createError: vi.fn(),
    setUserSession: vi.fn(),
}));
