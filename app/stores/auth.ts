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

// Define a more specific type for our user object to provide type safety.
interface AppUser {
    id: string;
    userRoles: {
        role: {
            name: "admin" | "user";
        };
    }[];
    [key: string]: any;
}

export const useAuthStore = defineStore("auth", () => {
    const {
        loggedIn,
        user,
        fetch: refreshSession,
        clear: clearSession,
    } = useUserSession<AppUser>();
    const logger = useLogger();

    const isLoggedIn = computed(() => loggedIn.value);

    /**
     * Checks if the currently logged-in user is an administrator.
     * The reason for this computed property is to provide a centralized and reusable way
     * to check for admin privileges across the application.
     */
    const isAdmin = computed(() => {
        if (!user.value || !Array.isArray(user.value.userRoles)) {
            return false;
        }
        return user.value.userRoles.some(
            (userRole) => userRole.role.name === "admin",
        );
    });

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
            await navigateTo("/admin/users"); // Redirect to the user management page after login
        } catch (error) {
            logger.error("Login error:", error);
            throw error;
        }
    };

    return { user, login, logout, isLoggedIn, isAdmin };
});
