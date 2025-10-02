import { defineStore } from "pinia";
import { useUserSession } from "#imports";
import { useLogger } from "~/composables/useLogger";
import { computed } from "vue";

/**
 * @file The auth store.
 * @description This store manages the authentication state of the user, including login, logout,
 * and session information. It also provides computed properties to easily check the user's
 * authentication status and role.
 */

export const useAuthStore = defineStore("auth", () => {
    const {
        loggedIn,
        user,
        fetch: refreshSession,
        clear: clearSession,
    } = useUserSession<UserResponse>();
    const logger = useLogger();

    const isLoggedIn = computed(() => loggedIn.value);

    /**
     * Checks if the currently logged-in user is an administrator.
     * The reason for this computed property is to provide a centralized and reusable way
     * to check for admin privileges across the application.
     */
    const isAdmin = computed(() => {
        if (!user.value || !Array.isArray(user.value.roles)) {
            return false;
        }
        return user.value.roles.some((role) => role.name === "admin");
    });

    const logout = async () => {
        await clearSession();
        await navigateTo("/auth/login");
    };

    const login = async (credentials: LoginCredentials) => {
        try {
            await $fetch("/api/auth/credentials", {
                method: "POST",
                body: credentials,
            });

            await refreshSession();
            await navigateTo("/admin/users"); // Redirect to the user management page after login
        } catch (error) {
            logger.error("Login error:", error);
            throw error;
        }
    };

    return { user, login, logout, isLoggedIn, isAdmin };
});
