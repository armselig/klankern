import { computed } from "vue";
import { useUserSession, useFetch } from "#imports";
import type { NewUser, UserResponse } from "#shared/types/user";

/**
 * @file Composable for admin-related checks.
 * @description This composable provides utility functions and computed properties
 * for checking administrative privileges of the current user.
 */
export const useAdmin = () => {
    const { user } = useUserSession();

    /**
     * Checks if the currently logged-in user is an administrator.
     * The reason for this computed property is to provide a centralized and reusable way
     * to check for admin privileges across the application.
     */
    const isAdmin = computed(() => {
        if (!user.value || !Array.isArray((user.value as UserResponse).roles)) {
            return false;
        }
        return (user.value as UserResponse).roles.some(
            (role: { id: string; name: string; description: string | null }) =>
                role.name === "admin",
        );
    });

    const createUser = async (userData: NewUser) => {
        return await useFetch("/api/admin/users", {
            method: "POST",
            body: userData,
        });
    };

    return { isAdmin, createUser };
};
