import { defineStore } from "pinia";
import { ref } from "vue";
import { useRuntimeConfig } from "#app";
import { useLogger } from "~/composables/useLogger";

export const useRolesStore = defineStore("roles", () => {
    const roles = ref([]);
    const loading = ref(false);
    const error = ref<Error | null>(null);
    const config = useRuntimeConfig();
    const logger = useLogger();

    async function fetchRoles() {
        loading.value = true;
        error.value = null;
        try {
            const response = await $fetch(
                `${config.public.apiBase}/admin/roles`,
            );
            roles.value = response.roles;
        } catch (err: any) {
            logger.error("Failed to fetch roles:", err); // Use logger
            error.value = err;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Creates a new role by sending a POST request to the API.
     * @param name The name of the new role.
     * @param description The description of the new role.
     */
    async function createRole(name: string, description: string) {
        loading.value = true;
        error.value = null;
        try {
            await $fetch(`${config.public.apiBase}/admin/roles`, {
                method: "POST",
                body: { name, description },
            });
            logger.info("Role created successfully", { name }); // Use logger
            await fetchRoles(); // Refresh the list of roles
        } catch (err: any) {
            logger.error("Failed to create role:", err); // Use logger
            error.value = err;
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
    async function fetchRoleById(id: string) {
        loading.value = true;
        error.value = null;
        try {
            const role = await $fetch(
                `${config.public.apiBase}/admin/roles/${id}`,
            );
            logger.info("Role fetched successfully", { id });
            return role;
        } catch (err: any) {
            logger.error(`Failed to fetch role with ID ${id}:`, err);
            error.value = err;
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Updates an existing role.
     * @param id The ID of the role to update.
     * @param name The new name for the role.
     * @param description The new description for the role.
     */
    async function updateRole(id: string, name: string, description: string) {
        loading.value = true;
        error.value = null;
        try {
            await $fetch(`${config.public.apiBase}/admin/roles/${id}`, {
                method: "PUT",
                body: { name, description },
            });
            logger.info("Role updated successfully", { id, name });
            await fetchRoles(); // Refresh the list of roles
        } catch (err: any) {
            logger.error(`Failed to update role with ID ${id}:`, err);
            error.value = err;
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
        } catch (err: any) {
            logger.error(`Failed to delete role with ID ${id}:`, err);
            error.value = err;
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
