import { defineStore } from "pinia";
import { ref } from "vue";
import { useRuntimeConfig } from "#app";
import { useLogger } from "~/composables/useLogger";
import type { RoleResponse, CreateRole, UpdateRole } from "#shared/types/role";

export const useRolesStore = defineStore("roles", () => {
    const roles = ref<RoleResponse[]>([]);
    const loading = ref(false);
    const error = ref<Error | null>(null);
    const config = useRuntimeConfig();
    const logger = useLogger();

    async function fetchRoles() {
        loading.value = true;
        error.value = null;
        try {
            const response = await $fetch<{ roles: RoleResponse[] }>(
                `${config.public.apiBase}/admin/roles`,
            );
            roles.value = response.roles;
        } catch (err: unknown) {
            const errorToLog =
                err instanceof Error ? err : new Error(String(err));
            logger.error("Failed to fetch roles:", errorToLog); // Use logger
            error.value = errorToLog;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Creates a new role by sending a POST request to the API.
     * @param newRoleData The data for the new role.
     */
    async function createRole(newRoleData: CreateRole) {
        loading.value = true;
        error.value = null;
        try {
            await $fetch(`${config.public.apiBase}/admin/roles`, {
                method: "POST",
                body: newRoleData,
            });
            logger.info("Role created successfully", {
                name: newRoleData.name,
            }); // Use logger
            await fetchRoles(); // Refresh the list of roles
        } catch (err: unknown) {
            const errorToLog =
                err instanceof Error ? err : new Error(String(err));
            logger.error("Failed to create role:", errorToLog); // Use logger
            error.value = errorToLog;
            throw err; // Re-throw to allow component to handle navigation if needed
        } finally {
            loading.value = false;
        }
    }

    /**
     * Fetches a single role by its ID.
     * @param id The ID of the role to fetch.
     * @returns The fetched role, or null if not found.
     */
    async function fetchRoleById(id: string): Promise<RoleResponse | undefined> {
        loading.value = true;
        error.value = null;
        try {
            const role = await $fetch<RoleResponse>(
                `${config.public.apiBase}/admin/roles/${id}`,
            );
            logger.info("Role fetched successfully", { id });
            return role;
        } catch (err: unknown) {
            const errorToLog =
                err instanceof Error ? err : new Error(String(err));
            logger.error(`Failed to fetch role with ID ${id}:`, errorToLog);
            error.value = errorToLog;
            return;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Updates an existing role.
     * @param id The ID of the role to update.
     * @param updatedRoleData The new data for the role.
     */
    async function updateRole(id: string, updatedRoleData: UpdateRole) {
        loading.value = true;
        error.value = null;
        try {
            await $fetch(`${config.public.apiBase}/admin/roles/${id}`, {
                method: "PUT",
                body: updatedRoleData,
            });
            logger.info("Role updated successfully", {
                id,
                name: updatedRoleData.name,
            });
            await fetchRoles(); // Refresh the list of roles
        } catch (err: unknown) {
            const errorToLog =
                err instanceof Error ? err : new Error(String(err));
            logger.error(`Failed to update role with ID ${id}:`, errorToLog);
            error.value = errorToLog;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Deletes a role by its ID.
     * @param id The ID of the role to delete.
     */
    async function deleteRole(id: string) {
        loading.value = true;
        error.value = null;
        try {
            await $fetch(`${config.public.apiBase}/admin/roles/${id}`, {
                method: "DELETE",
            });
            logger.info("Role deleted successfully", { id });
            await fetchRoles(); // Refresh the list of roles
        } catch (err: unknown) {
            const errorToLog =
                err instanceof Error ? err : new Error(String(err));
            logger.error(`Failed to delete role with ID ${id}:`, errorToLog);
            error.value = errorToLog;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        roles,
        loading,
        error,
        fetchRoles,
        createRole,
        fetchRoleById,
        updateRole,
        deleteRole,
    };
});
