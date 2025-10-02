<template>
    <form @submit.prevent="handleSubmit">
        <form-user-base v-model:user="formData" />
        <button-base type="submit">Create User</button-base>
    </form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { CreateUserFormData } from "#/shared/types/user";

const emit = defineEmits(["submit"]);

const formData = ref<CreateUserFormData>({
    username: "",
    email: "",
    password: "",
    display_name: undefined,
    first_name: undefined,
    last_name: undefined,
    roleIds: [] as string[],
});

const handleSubmit = () => {
    emit("submit", formData.value);
};
</script>
