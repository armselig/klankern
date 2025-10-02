<template>
    <form @submit.prevent="handleSubmit">
        <form-user-base
            v-model:username="formData.username"
            v-model:email="formData.email"
            v-model:display_name="formData.display_name"
            v-model:first_name="formData.first_name"
            v-model:last_name="formData.last_name"
            v-model:role-ids="formData.roleIds"
        />

        <div>
            <label for="password">Password</label>
            <input id="password" v-model="formData.password" type="password" />
            <small>Leave blank to keep the current password.</small>
            <span v-if="getErrorMessage('password')" class="error-message">{{
                getErrorMessage("password")
            }}</span>
        </div>

        <button-base type="submit">Update User</button-base>
        <button-base type="button" @click="handleCancel">Cancel</button-base>
    </form>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { z } from "zod";
import FormUserBase from "./form-user-base.vue";

/**
 * @file Form component for updating existing users.
 * @description This component utilizes `form-user-base.vue` for common fields and adds
 * specific logic for user updates, including an optional password field.
 */

const props = defineProps({
    user: {
        type: Object as PropType<UserResponse>,
        required: true,
    },
});

const emit = defineEmits(["submit", "cancel"]);

const formData = ref<UpdateUserFormData>({
    username: "",
    email: "",
    password: "",
    display_name: undefined,
    first_name: undefined,
    last_name: undefined,
    roleIds: [] as string[],
});

const errors = ref<z.ZodIssue[]>([]);

const getErrorMessage = computed(() => (path: string) => {
    const error = errors.value.find((err) => err.path.includes(path));
    return error ? error.message : "";
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
            formData.value.display_name = newUser.displayName || undefined;
            formData.value.first_name = newUser.first_name || undefined;
            formData.value.last_name = newUser.last_name || undefined;
            formData.value.roleIds = newUser.roles.map((role) => role.id);
        }
    },
    { immediate: true },
);

function validateForm() {
    const result = updateUserFormSchema.safeParse(formData.value);
    if (!result.success) {
        errors.value = result.error.issues;
        return false;
    }
    errors.value = [];
    return true;
}

function handleSubmit() {
    if (!validateForm()) {
        return;
    }

    const submissionData: UpdateUser = {
        username: formData.value.username,
        email: formData.value.email,
        display_name: formData.value.display_name,
        first_name: formData.value.first_name,
        last_name: formData.value.last_name,
        roleIds:
            formData.value.roleIds.length > 0
                ? formData.value.roleIds
                : undefined,
    };

    // Only include password if it's not empty
    if (formData.value.password) {
        submissionData.password = formData.value.password;
    }

    emit("submit", submissionData);
}

function handleCancel() {
    navigateTo("/admin/users");
}
</script>

<style scoped>
.error-message {
    color: red;
    font-size: 0.8em;
    margin-top: 0.2em;
}
</style>
