<template>
    <form @submit.prevent="handleSubmit">
        <fieldset>
            <legend>User Details</legend>
            <div>
                <label for="username">Username</label>
                <input
                    id="username"
                    v-model="formData.username"
                    type="text"
                    required
                />
            </div>
            <div>
                <label for="email">Email</label>
                <input
                    id="email"
                    v-model="formData.email"
                    type="email"
                    required
                />
            </div>
            <div>
                <label for="password">Password</label>
                <input
                    id="password"
                    v-model="formData.password"
                    type="password"
                    :required="!isEditMode"
                />
                <small v-if="isEditMode"
                    >Leave blank to keep the current password.</small
                >
            </div>
            <div>
                <label for="display_name">Display Name</label>
                <input
                    id="display_name"
                    v-model="formData.display_name"
                    type="text"
                />
            </div>
            <div>
                <label for="first_name">First Name</label>
                <input
                    id="first_name"
                    v-model="formData.first_name"
                    type="text"
                />
            </div>
            <div>
                <label for="last_name">Last Name</label>
                <input
                    id="last_name"
                    v-model="formData.last_name"
                    type="text"
                />
            </div>
        </fieldset>

        <fieldset>
            <legend>Roles</legend>
            <div v-for="role in availableRoles" :key="role.id">
                <input
                    :id="`role-${role.id}`"
                    v-model="formData.roleIds"
                    type="checkbox"
                    :value="role.id"
                />
                <label :for="`role-${role.id}`">{{ role.name }}</label>
            </div>
        </fieldset>

        <button-base type="submit"
            >{{ isEditMode ? "Update" : "Create" }} User</button-base
        >
    </form>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useAdminUserStore } from "~/stores/admin/users";

/**
 * @file A reusable form for creating and editing users.
 * @description This component encapsulates the user form fields and logic.
 * It can be used for both creating a new user and editing an existing one.
 */

const props = defineProps({
    user: {
        type: Object as PropType<UserResponse | null>,
        default: null,
    },
});

const emit = defineEmits(["submit"]);

const userStore = useAdminUserStore();
const { roles: availableRoles } = storeToRefs(userStore);

const isEditMode = computed(() => !!props.user);

// The formData is a reactive object that holds the state of the form.
const formData = ref<NewUser | UpdateUser>({
    username: "",
    email: "",
    password: "",
    display_name: "",
    first_name: "",
    last_name: "",
    roleIds: [] as string[],
});

/**
 * Why watch the user prop?
 * When this form is used for editing, the user data might be fetched asynchronously.
 * This watcher ensures that once the user prop is populated, the form data is updated
 * to reflect the user's current details.
 */
watch(
    () => props.user,
    (newUser) => {
        if (newUser) {
            formData.value.username = newUser.username;
            formData.value.email = newUser.email;
            formData.value.display_name = newUser.displayName || "";
            formData.value.first_name = newUser.first_name || "";
            formData.value.last_name = newUser.last_name || "";
            formData.value.roleIds = newUser.roles.map((role) => role.id);
        }
    },
    { immediate: true },
);

function handleSubmit() {
    // Create a copy to avoid unintended reactivity issues downstream.
    const submissionData = { ...formData.value };
    // Don't submit an empty password string if it's not being changed in edit mode.
    if (isEditMode.value && !submissionData.password) {
        delete submissionData.password;
    }
    emit("submit", submissionData);
}

onMounted(() => {
    // Fetch available roles if they haven't been fetched already.
    if (availableRoles.value.length === 0) {
        userStore.fetchRoles();
    }
});
</script>
