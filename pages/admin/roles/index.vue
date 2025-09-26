<template>
    <main>
        <h1>Roles Management</h1>

        <section aria-live="polite">
            <p v-if="rolesStore.loading" class="status-message">
                Loading roles...
            </p>
            <p v-if="rolesStore.error" class="error-message" role="alert">
                Error: {{ rolesStore.error.message }}
            </p>
        </section>

        <section v-if="rolesStore.roles.length">
            <h2 class="sr-only">List of Roles</h2>
            <table>
                <thead>
                    <tr>
                        <th scope="col">Role Name</th>
                        <th scope="col">Description</th>
                        <th scope="col">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="role in rolesStore.roles" :key="role.id">
                        <td>{{ role.name }}</td>
                        <td>{{ role.description }}</td>
                        <td>
                            <router-link :to="`/admin/roles/${role.id}`"
                                >Edit</router-link
                            >
                            <button @click="confirmDelete(role.id, role.name)">
                                Delete
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>

        <section v-else-if="!rolesStore.loading">
            <h2 class="status-message">No roles found.</h2>
            <p>There are no roles to display. Please create a new role.</p>
        </section>
    </main>
</template>

<script setup lang="ts">
import { useRolesStore } from "~/stores/admin/roles";
import { onMounted } from "vue";

const rolesStore = useRolesStore();

onMounted(() => {
    rolesStore.fetchRoles();
});

/**
 * Confirms with the user before attempting to delete a role.
 * @param id The ID of the role to delete.
 * @param name The name of the role to delete.
 */
const confirmDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the role "${name}"?`)) {
        try {
            await rolesStore.deleteRole(id);
            // No need to manually remove from rolesStore.roles, fetchRoles() will refresh
        } catch {
            // Error is handled and displayed by the store
        }
    }
};
</script>

<style scoped>
/* No CSS for now, as per user's request to focus on functionality and semantic HTML */
</style>
