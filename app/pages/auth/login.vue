<template>
    <div class="login-container">
        <form class="login-form" @submit.prevent="submitLoginForm">
            <h2>Login</h2>
            <div class="form-group">
                <label>
                    Email:
                    <input
                        id="login-form__email-input"
                        v-model="email"
                        type="email"
                        required
                    />
                </label>
            </div>
            <div class="form-group">
                <label>
                    Password:
                    <input
                        id="login-form__password-input"
                        v-model="password"
                        type="password"
                        required
                    />
                </label>
            </div>
            <button type="submit">Login</button>
        </form>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    middleware: ["guest"],
});

import { ref } from "vue";
import { useAuthStore } from "~/stores/auth";
import { useLogger } from "~/composables/useLogger";

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const authStore = useAuthStore();
const logger = useLogger();

const submitLoginForm = async () => {
    errorMessage.value = ""; // Clear previous errors
    try {
        const credentials: LoginCredentials = {
            email: email.value,
            password: password.value,
        };
        await authStore.login(credentials);
    } catch (error: any) {
        errorMessage.value =
            error.data?.message ||
            "Login failed. Please check your credentials.";
        logger.error("Login error:", error);
    }
};
</script>
