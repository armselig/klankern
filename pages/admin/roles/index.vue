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
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="role in rolesStore.roles" :key="role.id">
                        <td>{{ role.name }}</td>
                        <td>{{ role.description }}</td>
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

<script setup>
import { useRolesStore } from "~/stores/admin/roles";
import { onMounted } from "vue";

const rolesStore = useRolesStore();

onMounted(() => {
    rolesStore.fetchRoles();
});
</script>
