import { describe, test, expect } from "vitest";
import { setup } from "@nuxt/test-utils/e2e";

/**
 * @description E2E test for the family creation user flow.
 */
describe("E2E: Family Creation", async () => {
    // This sets up the Nuxt environment in development mode, which enables hot-reloading for new files.
    await setup({ browser: true });

    test("authentication endpoint should not exist yet", async () => {
        // This test is the "Red" step. It proves the endpoint doesn't exist.
        await expect(
            $fetch("/api/__test__/login", {
                method: "POST",
                body: { userId: "any-id" },
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });
    }, 30000);
});
