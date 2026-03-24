import { navigateTo, useLogger, useUserSession } from "#imports";
import type {
    LoginCredentials,
    RegisterBody,
    RegisterResponse,
} from "#shared/types/auth";

/**
 * @file Composable for handling authentication logic.
 * @description Centralizes login, logout, and registration with session
 * management. Navigation decisions on success are left to the calling page
 * so the composable stays side-effect-free with respect to routing.
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
     * On success, refreshes session and navigates based on user state:
     * - Admin → /admin/users
     * - Has families → /families/[first family id]
     * - No families → /auth/onboarding
     */
    const login = async (credentials: LoginCredentials) => {
        try {
            await $fetch("/api/auth/credentials", {
                method: "POST",
                body: credentials,
            });
            await refreshSession();

            const sessionUser = user.value as
                | {
                      roles?: Array<{ name: string }>;
                      families?: Array<{ id: string }>;
                  }
                | undefined;
            const isAdmin =
                sessionUser?.roles?.some((r) => r.name === "admin") ?? false;
            const families = sessionUser?.families ?? [];

            if (isAdmin) {
                return navigateTo("/admin/users");
            } else if (families.length > 0) {
                return navigateTo(`/families/${families[0]!.id}`);
            } else {
                return navigateTo("/auth/onboarding");
            }
        } catch (error) {
            logger.error("Login error:", { error });
            throw error;
        }
    };

    /**
     * Registers a new user. If an invite token is provided, the account is
     * created and the invite accepted atomically server-side.
     * Calls refreshSession() before returning so client middleware sees the
     * updated session (including families) before any navigation fires.
     */
    const register = async (body: RegisterBody): Promise<RegisterResponse> => {
        try {
            const result = await $fetch<{ userId: string; familyId?: string }>(
                "/api/auth/register",
                { method: "POST", body },
            );
            // Refresh session BEFORE returning so client middleware sees updated
            // families array on the very next navigation.
            await refreshSession();
            return {
                success: true,
                userId: result.userId,
                familyId: result.familyId,
            };
        } catch (error: unknown) {
            logger.error("Registration error:", { error });
            const h3Err = error as {
                data?: { code?: string };
                statusMessage?: string;
            } | null;
            return {
                success: false,
                error:
                    h3Err?.statusMessage ??
                    "Registration failed. Please try again.",
                code: h3Err?.data?.code,
            };
        }
    };

    /**
     * Logs the user out by clearing the session server-side and client-side,
     * then redirects to the home page.
     */
    const logout = async () => {
        try {
            await $fetch("/api/auth/logout", { method: "POST" });
        } catch (error) {
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
        register,
        loggedIn,
        user,
    };
};
