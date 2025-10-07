import { defineStore } from "pinia";
import { useLogger } from "~/composables/useLogger";

/**
 * @file The user management store for the admin section.
 * @description This store handles the state and actions related to managing users
 * and roles in the admin interface.
 */

// Type definitions
type Role = RoleResponse;

interface AdminUsersState {
    users: UserResponse[];
    currentUser: UserResponse | null;
    roles: Role[];
    loading: boolean;
    error: unknown;
}

export const useAdminUserStore = defineStore("admin-users", {
    state: (): AdminUsersState => ({
        users: [],
        currentUser: null,
        roles: [],
        loading: false,
        error: null,
    }),

    actions: {
        /**
         * Fetches all users from the backend.
         */
        async fetchUsers() {
            const logger = useLogger();
            this.loading = true;
            this.error = null;
            try {
                const users = await $fetch<UserResponse[]>("/api/admin/users");
                this.users = users;
            } catch (error: unknown) {
                const errorToLog =
                    error instanceof Error ? error : new Error(String(error));
                this.error = errorToLog;
                logger.error("Error fetching users:", errorToLog);
            }
            this.loading = false;
        },

        /**
         * Fetches a single user from the backend.
         * @param id The ID of the user to fetch.
         */
        async fetchUser(id: string) {
            const logger = useLogger();
            this.loading = true;
            this.error = null;
            try {
                const user = await $fetch<UserResponse>(
                    `/api/admin/users/${id}`,
                );
                this.currentUser = user;
                return user;
            } catch (error: unknown) {
                const errorToLog =
                    error instanceof Error ? error : new Error(String(error));
                this.error = errorToLog;
                logger.error(`Error fetching user with ID ${id}:`, errorToLog);
                throw errorToLog;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Fetches all roles from the backend.
         */
        async fetchRoles() {
            const logger = useLogger();
            try {
                const roles = await $fetch<Role[]>("/api/admin/roles");
                this.roles = roles;
            } catch (error: unknown) {
                // Explicitly type error as unknown
                if (error instanceof Error) {
                    this.error = error;
                } else {
                    this.error = new Error(String(error)); // Wrap unknown errors in an Error object
                }
                logger.error("Error fetching roles:", error);
            }
        },

        /**
         * Creates a new user.
         * @param userData The data for the new user.
         */
        async createUser(userData: NewUser) {
            const logger = useLogger();
            this.loading = true;
            this.error = null;
            try {
                const newUser = await $fetch<UserResponse>("/api/admin/users", {
                    method: "POST",
                    body: userData,
                });
                this.users.push(newUser);
                return newUser;
            } catch (error: unknown) {
                const errorToLog =
                    error instanceof Error ? error : new Error(String(error));
                this.error = errorToLog;
                logger.error("Error creating user:", errorToLog);
                throw errorToLog;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Updates an existing user.
         * @param id The ID of the user to update.
         * @param userData The new data for the user.
         */
        async updateUser(id: string, userData: UpdateUser) {
            const logger = useLogger();
            this.loading = true;
            this.error = null;
            try {
                const updatedUser = await $fetch<UserResponse>(
                    `/api/admin/users/${id}`,
                    {
                        method: "PUT",
                        body: userData,
                    },
                );
                // Update the user in the main list
                const index = this.users.findIndex((u) => u.id === id);
                if (index !== -1) {
                    this.users[index] = updatedUser;
                }
                // Update the currentUser if it's the one being edited
                if (this.currentUser?.id === id) {
                    this.currentUser = updatedUser;
                }
                return updatedUser;
            } catch (error: unknown) {
                const errorToLog =
                    error instanceof Error ? error : new Error(String(error));
                this.error = errorToLog;
                logger.error(`Error updating user with ID ${id}:`, errorToLog);
                throw errorToLog;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Deletes a user.
         * @param id The ID of the user to delete.
         */
        async deleteUser(id: string) {
            const logger = useLogger();
            this.loading = true;
            this.error = null;
            try {
                await $fetch(`/api/admin/users/${id}`, { method: "DELETE" });
                this.users = this.users.filter((u) => u.id !== id);
            } catch (error: unknown) {
                const errorToLog =
                    error instanceof Error ? error : new Error(String(error));
                this.error = errorToLog;
                logger.error(`Error deleting user with ID ${id}:`, errorToLog);
                throw errorToLog;
            }
            this.loading = false;
        },

        /**
         * Toggles a user's active status.
         * @param user The user to update.
         */
        async toggleUserStatus(user: UserResponse) {
            const logger = useLogger();
            const newStatus = !user.is_active;
            try {
                const updatedUser = await $fetch<UserResponse>(
                    `/api/admin/users/${user.id}/status`,
                    {
                        method: "PUT",
                        body: { is_active: newStatus },
                    },
                );
                const index = this.users.findIndex((u) => u.id === user.id);
                if (index !== -1) {
                    this.users[index] = updatedUser;
                }
            } catch (error: unknown) {
                const errorToLog =
                    error instanceof Error ? error : new Error(String(error));
                logger.error(
                    `Error toggling status for user with ID ${user.id}:`,
                    errorToLog,
                );
                // Optionally revert state on failure, or show an error message
            }
        },
    },
});
