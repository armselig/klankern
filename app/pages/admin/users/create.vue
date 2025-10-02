<template>
    <div>
        <h1>Create New User</h1>
        <form-user-create @submit="handleSubmit" @cancel="handleCancel" />
        <p v-if="isSubmitting">Creating user...</p>
        <p v-if="error" class="error">
            Error creating user: {{ error.message }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAdminUserStore } from "~/stores/admin/users";
import FormUserCreate from "~/components/admin/form-user-create.vue";

/**
 * @file Page for creating a new user.
 * @description This page hosts the user-form component and handles the submission
 * logic for creating a new user.
 */

const userStore = useAdminUserStore();
const isSubmitting = ref(false);
const error = ref<any | null>(null);

/**
 * Handles the form submission event.
 * The reason for this handler is to orchestrate the user creation process,
 * including calling the store action, handling loading states, and navigating
 * upon success.
 * @param formData The user data from the form.
 */
async function handleSubmit(formData: NewUser) {
    isSubmitting.value = true;
    error.value = null;
    try {
        await userStore.createUser(formData);
        await navigateTo("/admin/users");
    } catch (err) {
        error.value = err;
    } finally {
        isSubmitting.value = false;
    }
}

function handleCancel() {
    navigateTo("/admin/users");
}
</script>

<style scoped>
.error {
    color: red;
}
</style>
