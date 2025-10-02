<template>
    <div>
        <h1>Create New User</h1>
        <form-user-create @submit="handleCreateUser" />
        <p v-if="userStore.loading">Creating user...</p>
        <p v-if="userStore.error" class="error">
            Error creating user:
            {{ userStore.error.data?.message || userStore.error.message }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { useAdminUserStore } from "#/app/stores/admin/users";
import type { CreateUserFormData } from "#/shared/types/user";

const userStore = useAdminUserStore();

const handleCreateUser = async (formData: CreateUserFormData) => {
    try {
        await userStore.createUser(formData);
        await navigateTo("/admin/users");
    } catch (error) {
        // Error is already handled and logged in the store
        // We just need to prevent navigation
    }
};
</script>

<style scoped>
.error {
    color: red;
}
</style>
