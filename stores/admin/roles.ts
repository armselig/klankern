import { defineStore } from "pinia";
import { ref } from "vue";
import { useRuntimeConfig } from "#app"; // Import useRuntimeConfig

export const useRolesStore = defineStore("roles", () => {
    const roles = ref([]);
    const loading = ref(false);
    const error = ref(null);

    async function fetchRoles() {
        loading.value = true;
        error.value = null;
        try {
            const config = useRuntimeConfig();
            const response = await $fetch(
                `${config.public.apiBase}/admin/roles`,
            );
            roles.value = response.roles;
        } catch (err) {
            error.value = err;
        } finally {
            loading.value = false;
        }
    }

    return {
        roles,
        loading,
        error,
        fetchRoles,
    };
});
