<template>
    <main>
        <h1>Create New Role</h1>

        <form @submit.prevent="handleCreateRole">
            <section aria-live="polite">
                <p v-if="rolesStore.loading" class="status-message">
                    Creating role...
                </p>
                <p v-if="rolesStore.error" class="error-message" role="alert">
                    Error: {{ rolesStore.error.message }}
                </p>
            </section>

            <div class="form-group">
                <label>
                    Role Name:
                    <input
                        id="role-create__name-input"
                        v-model="roleName"
                        type="text"
                        required
                    />
                </label>
            </div>

            <div class="form-group">
                <label>
                    Description:
                    <textarea
                        id="role-create__description-textarea"
                        v-model="roleDescription"
                    ></textarea>
                </label>
            </div>

            <button type="submit" :disabled="rolesStore.loading">
                Create Role
            </button>
            <button
                type="button"
                :disabled="rolesStore.loading"
                @click="goBack"
            >
                Cancel
            </button>
        </form>
    </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useRolesStore } from "~/stores/admin/roles"; // Import the store
import { definePageMeta } from "#imports";

definePageMeta({ middleware: "auth" });

const roleName = ref("");
const roleDescription = ref("");
const router = useRouter();
const rolesStore = useRolesStore(); // Initialize the store

/**
 * Handles the creation of a new role by calling the store action.
 * Redirects to the roles list on success.
 */
const handleCreateRole = async () => {
    try {
        const createPayload: CreateRole = {
            name: roleName.value,
            description: roleDescription.value,
        };
        await rolesStore.createRole(createPayload);
        void router.push("/admin/roles"); // Navigate only on success
    } catch {
        // Error is handled and displayed by the store, no need to re-handle here
        // The component can react to rolesStore.error
        return false;
    }
};

/**
 * Navigates back to the roles list page.
 */
const goBack = () => {
    void router.push("/admin/roles");
};
</script>

<style scoped>
/* No CSS for now, as per user's request to focus on functionality and semantic HTML */
</style>
