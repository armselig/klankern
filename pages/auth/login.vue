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
import { useAuth } from "#app/composables/useAuth"; // Import useAuth composable

const email = ref("");
const password = ref("");
const { login } = useAuth(); // Initialize useAuth composable

/**
 * Handles the submission of the login form.
 * This function is responsible for initiating the login process by
 * calling the login function from the useAuth composable with the
 * user's credentials (email and password).
 */
const submitLoginForm = async () => {
    await login(email.value, password.value);
};
</script>
