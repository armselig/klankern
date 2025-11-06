/**
 * @fileoverview Unit tests for soft delete helper functions
 *
 * Tests the notDeleted helper function behavior
 */

import { describe, it, expect } from "vitest";
import { notDeleted } from "#server/db/helpers";
import {
    familyMembers,
    familyInvitations,
    corkboardPosts,
} from "#server/db/schema";

describe("Soft Delete Helper Functions", () => {
    describe("notDeleted", () => {
        it("should return a SQL condition for tables with deleted_at column", () => {
            const condition = notDeleted(familyMembers);
            expect(condition).toBeDefined();
            expect(condition).not.toBeUndefined();
        });

        it("should work with family_members table", () => {
            const condition = notDeleted(familyMembers);
            expect(condition).toBeDefined();
        });

        it("should work with family_invitations table", () => {
            const condition = notDeleted(familyInvitations);
            expect(condition).toBeDefined();
        });

        it("should work with corkboard_posts table", () => {
            const condition = notDeleted(corkboardPosts);
            expect(condition).toBeDefined();
        });

        it("should return undefined for tables without deleted_at column", () => {
            // Create a mock table without deleted_at
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mockTableWithoutDeletedAt = {} as any;
            const condition = notDeleted(mockTableWithoutDeletedAt);
            expect(condition).toBeUndefined();
        });
    });
});
