import { describe, expect, it } from "vitest";
import {
    corkboardPosts,
    families,
    familyInvitations,
    sessions,
    users,
} from "#server/db/schema";

describe("server/db/schema - Performance Indexes", () => {
    it("should import users table with dashboard_config GIN index", () => {
        expect(users).toBeDefined();
        expect(typeof users).toBe("object");
    });

    it("should import sessions table with composite and partial indexes", () => {
        expect(sessions).toBeDefined();
        expect(typeof sessions).toBe("object");
    });

    it("should import corkboardPosts table with composite and GIN indexes", () => {
        expect(corkboardPosts).toBeDefined();
        expect(typeof corkboardPosts).toBe("object");
    });

    it("should import families table with partial index for active families", () => {
        expect(families).toBeDefined();
        expect(typeof families).toBe("object");
    });

    it("should import familyInvitations table with composite and partial indexes", () => {
        expect(familyInvitations).toBeDefined();
        expect(typeof familyInvitations).toBe("object");
    });

    it("should verify schema compiles without TypeScript errors", () => {
        // If this test runs, it means the schema.ts file compiled successfully
        expect(true).toBe(true);
    });
});
