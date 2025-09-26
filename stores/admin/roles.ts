import { defineStore } from "pinia";
import { ref } from "vue";
import { useRuntimeConfig } from "#app";
import { useLogger } from "~/composables/useLogger"; // Import useLogger

export const useRolesStore = defineStore("roles", () => {
    const roles = ref([]);
    const loading = ref(false);
    const error = ref<Error | null>(null);
    const config = useRuntimeConfig();
    const logger = useLogger(); // Initialize logger

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
            // Optionally, refetch roles to update the list
            await fetchRoles();
        } catch (err: any) {
            logger.error("Failed to create role:", err); // Use logger
            error.value = err;
            throw err; // Re-throw to allow component to handle navigation if needed
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
    };
});
