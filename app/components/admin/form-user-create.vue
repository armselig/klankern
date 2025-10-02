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
            <input
                id="password"
                v-model="formData.password"
                type="password"
                required
            />
            <span v-if="getErrorMessage('password')" class="error-message">{{
                getErrorMessage("password")
            }}</span>
        </div>

        <button-base type="submit">Create User</button-base>
        <button-base type="button" @click="handleCancel">Cancel</button-base>
    </form>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { z } from "zod";
import FormUserBase from "./form-user-base.vue";

/**
 * @file Form component for creating new users.
 * @description This component utilizes `form-user-base.vue` for common fields and adds
 * specific logic for user creation, including a required password field.
 */

const emit = defineEmits(["submit", "cancel"]);

const formData = ref<CreateUserFormData>({
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

function validateForm() {
    const result = createUserFormSchema.safeParse(formData.value);
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

    const submissionData: NewUser = {
        username: formData.value.username,
        email: formData.value.email,
        password: formData.value.password,
        display_name: formData.value.display_name,
        first_name: formData.value.first_name,
        last_name: formData.value.last_name,
        roleIds:
            formData.value.roleIds.length > 0
                ? formData.value.roleIds
                : undefined,
    };
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
