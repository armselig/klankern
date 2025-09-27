import { defineStore } from "pinia";
import { useUserSession } from "#app/composables/useUserSession";
import { useLogger } from "~/composables/useLogger";

export const useAuthStore = defineStore("auth", () => {
    const { fetch: refreshSession } = useUserSession();
    const logger = useLogger();

    const login = async (email, password) => {
        try {
            await $fetch("/api/auth/credentials", {
                method: "POST",
                body: { email, password },
            });

            await refreshSession();
            await navigateTo("/admin/roles");
        } catch (error) {
            logger.error("Login error:", error);
            throw error;
        }
    };

    return { login };
});
