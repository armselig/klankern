<template>
    <div>
        <h1>Edit User</h1>
        <div v-if="loading">Loading user...</div>
        <div v-else-if="error">Error loading user: {{ error.message }}</div>
        <form-user-update
            v-else-if="user"
            :user="user"
            @submit="handleSubmit"
        />
    </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { useAdminUserStore } from "~/stores/admin/users";
import FormUserUpdate from "~/components/admin/form-user-update.vue";
import { definePageMeta } from "#imports";

/**
 * @file Page for editing an existing user.
 * @description This page fetches the user's data and uses the user-form
 * component to allow an administrator to modify it.
 */

definePageMeta({
    middleware: "admin",
});

const route = useRoute();
const userStore = useAdminUserStore();
const { currentUser: user, loading, error } = storeToRefs(userStore);

const userId = route.params.id as string;

/**
 * Handles the form submission event from the user-form component.
 * @param formData The updated user data from the form.
 */
async function handleSubmit(formData: UpdateUser) {
    try {
        await userStore.updateUser(userId, formData);
        await navigateTo("/admin/users");
    } catch {
        // The store action will set the error state
    }
}

/**
 * Fetches the user data when the component is mounted.
 * This ensures that the form is populated with the correct data for editing.
 */
onMounted(() => {
    userStore.fetchUser(userId);
});
</script>
