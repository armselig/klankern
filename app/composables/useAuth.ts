import { navigateTo, useLogger, useUserSession } from "#imports";
import type { LoginCredentials } from "#shared/types/auth";

/**
 * @file Composable for handling authentication logic.
 * @description This composable centralizes the login and logout functionalities,
 * providing a clean and reusable way to manage authentication-related API calls and session handling.
 */
export const useAuth = () => {
    const {
        fetch: refreshSession,
        clear: clearSession,
        loggedIn,
        user,
    } = useUserSession();
    const logger = useLogger();

    /**
     * Attempts to log the user in with the provided credentials.
     * On success, it refreshes the session and navigates to the admin page.
     * @param credentials The user's login credentials.
     */
    const login = async (credentials: LoginCredentials) => {
        try {
            await $fetch("/api/auth/credentials", {
                method: "POST",
                body: credentials,
            });
            await refreshSession();
            return navigateTo("/admin/users");
        } catch (error) {
            logger.error("Login error:", { error });
            throw error; // Re-throw to be handled by the component
        }
    };

    /**
     * Logs the user out by clearing the session server-side and client-side,
     * then redirects to the home page.
     */
    const logout = async () => {
        try {
            // Clear server-side session first
            await $fetch("/api/auth/logout", { method: "POST" });
        } catch (error) {
            // Log but don't block logout if server call fails
            logger.warn("Server logout failed, clearing client session:", {
                error,
            });
        }
        await clearSession();
        await navigateTo("/");
    };

    return {
        login,
        logout,
        // Expose session state for convenience (prefer useUserSession() directly for reactivity)
        loggedIn,
        user,
    };
};
