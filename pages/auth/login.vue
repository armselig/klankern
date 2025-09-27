<template>
    <div class="login-container">
        <form class="login-form" @submit.prevent="submitLoginForm">
            <h2>Login</h2>
            <div class="form-group">
                <label for="login-form__email-input">Email:</label>
                <input
                    id="login-form__email-input"
                    v-model="email"
                    type="email"
                    required
                />
            </div>
            <div class="form-group">
                <label for="login-form__password-input">Password:</label>
                <input
                    id="login-form__password__input"
                    v-model="password"
                    type="password"
                    required
                />
            </div>
            <button type="submit">Login</button>
        </form>
    </div>
</template>

<script setup lang="ts">
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
        await authStore.login(email.value, password.value);
    } catch (error: any) {
        errorMessage.value =
            error.data?.message ||
            "Login failed. Please check your credentials.";
        logger.error("Login error:", error);
    }
};
</script>
