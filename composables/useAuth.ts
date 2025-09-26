import { useRouter } from "vue-router";
import { useLogger } from "#app/composables/useLogger";

/**
 * Composable for handling authentication-related logic.
 * Encapsulates the login functionality, separating it from the presentation layer.
 */
export const useAuth = () => {
    const router = useRouter();
    const logger = useLogger();

    /**
     * Attempts to log in a user with the provided credentials.
     * @param email The user's email address.
     * @param password The user's password.
     * @returns A promise that resolves if login is successful, or rejects if it fails.
     */
    const login = async (email: string, password: string): Promise<void> => {
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                logger.info("Login successful:", data.message);
                // Redirect to the admin roles page after successful login
                router.push("/admin/roles");
            } else {
                logger.error(
                    "Login failed:",
                    data.statusMessage || "Unknown error",
                );
                alert(
                    data.statusMessage ||
                        "Failed to log in. Please check your credentials.",
                );
                throw new Error(data.statusMessage || "Login failed");
            }
        } catch (error) {
            logger.error("Network or unexpected error during login:", error);
            alert(
                "An unexpected error occurred during login. Please try again later.",
            );
            throw error; // Re-throw the error for the calling component to handle if needed
        }
    };

    return {
        login,
    };
};
