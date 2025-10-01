<template>
    <div>
        <header>
            <h1>User Management</h1>
            <button-base @click="goToCreatePage">Create User</button-base>
        </header>
        <div v-if="loading && users.length === 0">Loading users...</div>
        <div v-else-if="error">Error fetching users: {{ error.message }}</div>
        <table v-else>
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Roles</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="user in users" :key="user.id">
                    <td>{{ user.username }}</td>
                    <td>{{ user.email }}</td>
                    <td>
                        {{
                            user.userRoles.map((ur) => ur.role.name).join(", ")
                        }}
                    </td>
                    <td>{{ user.is_active ? "Active" : "Inactive" }}</td>
                    <td>
                        <nuxt-link :to="`/admin/users/${user.id}`"
                            >Edit</nuxt-link
                        >
                        <button-base @click="handleToggleStatus(user)">
                            {{ user.is_active ? "Deactivate" : "Activate" }}
                        </button-base>
                        <button-base @click="handleDelete(user.id)"
                            >Delete</button-base
                        >
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAdminUserStore, type User } from "~/stores/admin/users";

/**
 * @file Admin page for listing and managing users.
 * @description This page is the main interface for administrators to view all users
 * in the system. It fetches the user list from the store on mount.
 */

const userStore = useAdminUserStore();
const { users, loading, error } = storeToRefs(userStore);

function goToCreatePage() {
    navigateTo("/admin/users/create");
}

/**
 * Prompts the admin for confirmation and then deletes the user.
 * @param id The ID of the user to delete.
 */
async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this user?")) {
        await userStore.deleteUser(id);
    }
}

/**
 * Toggles the user's active status.
 * @param user The user object.
 */
async function handleToggleStatus(user: User) {
    await userStore.toggleUserStatus(user);
}

/**
 * The reason for fetching users onMounted is to ensure that the user list
 * is always up-to-date when the administrator navigates to this page.
 */
onMounted(() => {
    userStore.fetchUsers();
});
</script>

<style scoped>
header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th,
td {
    border: 1px solid #ccc;
    padding: 8px;
    text-align: left;
}

td button-base,
td a {
    margin-right: 8px;
}
</style>
