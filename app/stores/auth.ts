import { defineStore } from "pinia";
import { useUserSession } from "#imports";
import { useLogger } from "~/composables/useLogger";
import { computed } from "vue";

export const useAuthStore = defineStore("auth", () => {
    const {
        loggedIn,
        user,
        fetch: refreshSession,
        clear: clearSession,
    } = useUserSession();
    const logger = useLogger();

    const isLoggedIn = computed(() => loggedIn.value);

    const logout = async () => {
        await clearSession();
        await navigateTo("/auth/login");
    };

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

    return { login, logout, isLoggedIn };
});
