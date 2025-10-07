<template>
    <main>
        <h1>Edit Role</h1>

        <section aria-live="polite">
            <p v-if="rolesStore.loading" class="status-message">
                Loading role...
            </p>
            <p v-if="rolesStore.error" class="error-message" role="alert">
                Error: {{ rolesStore.error.message }}
            </p>
        </section>

        <form v-if="role" @submit.prevent="handleUpdateRole">
            <div class="form-group">
                <label>
                    Role Name:
                    <input
                        id="role-edit__name-input"
                        v-model="role.name"
                        type="text"
                        required
                    />
                </label>
            </div>

            <div class="form-group">
                <label>
                    Description:
                    <textarea
                        id="role-edit__description-textarea"
                        v-model="role.description"
                    ></textarea>
                </label>
            </div>

            <button type="submit" :disabled="rolesStore.loading">
                Update Role
            </button>
            <button
                type="button"
                :disabled="rolesStore.loading"
                @click="goBack"
            >
                Cancel
            </button>
        </form>
        <section v-else-if="!rolesStore.loading && !rolesStore.error">
            <p class="status-message">Role not found.</p>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useRolesStore } from "~/stores/admin/roles";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const router = useRouter();
const rolesStore = useRolesStore();

const role = ref<RoleResponse | null>(null);

/**
 * Fetches the role details when the component is mounted.
 */
onMounted(async () => {
    const roleId = route.params.id as string;
    if (roleId) {
        const fetchedRole = await rolesStore.fetchRoleById(roleId);
        if (fetchedRole) {
            role.value = fetchedRole;
        }
    }
});

/**
 * Handles the update of the role by calling the store action.
 * Redirects to the roles list on success.
 */
const handleUpdateRole = async () => {
    if (!role.value) return;

    try {
        const updatePayload: UpdateRole = {
            name: role.value.name,
            description: role.value.description,
        };
        await rolesStore.updateRole(role.value.id, updatePayload);
        void router.push("/admin/roles"); // Navigate only on success
    } catch {
        // Error is handled and displayed by the store, no need to re-handle here
        // The component can react to rolesStore.error
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
