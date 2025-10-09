<template>
    <form @submit.prevent="handleSubmit">
        <AdminFormUserBase v-model:user="formData" />

        <div>
            <label for="password">Password</label>
            <input
                id="password"
                v-model="formData.password"
                type="password"
                required
            />
        </div>
        <div>
            <label for="confirm_password">Confirm Password</label>
            <input
                id="confirm_password"
                v-model="confirmPassword"
                type="password"
                required
            />
        </div>

        <button-base type="submit">Create User</button-base>
    </form>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useLogger } from "#composables/useLogger";
import type { CreateUserFormData } from "#shared/types/user";

const emit = defineEmits(["submit"]);
const logger = useLogger();

const formData = ref<CreateUserFormData>({
    username: "",
    email: "",
    password: "",
    display_name: undefined,
    first_name: undefined,
    last_name: undefined,
    roleIds: [] as string[],
});

const confirmPassword = ref("");

watch(confirmPassword, (newVal) => {
    if (newVal !== formData.value.password) {
        // TODO: Handle password mismatch error, e.g., set an error message. Use debouncing.
        logger.warn("Passwords do not match!");
    }
});

const handleSubmit = () => {
    if (formData.value.password !== confirmPassword.value) {
        logger.warn("Passwords do not match!");
        return;
    }
    emit("submit", formData.value);
};
</script>
