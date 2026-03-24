<script setup lang="ts">
import { ref } from "vue";
import { definePageMeta } from "#imports";
import { useAuth } from "#composables/useAuth";
import { useLogger } from "#composables/useLogger";
import type { LoginCredentials } from "#shared/types/auth";

definePageMeta({ layout: "default" });

const email = ref("");
const password = ref("");
const isSubmitting = ref(false);
const errorEmail = ref("");
const errorPassword = ref("");
const errorGeneral = ref("");

const { login } = useAuth();
const logger = useLogger();

function clearErrors() {
    errorEmail.value = "";
    errorPassword.value = "";
    errorGeneral.value = "";
}

async function submitLoginForm() {
    clearErrors();

    isSubmitting.value = true;
    try {
        const credentials: LoginCredentials = {
            email: email.value,
            password: password.value,
        };
        await login(credentials);
    } catch (error: unknown) {
        const h3Err = error as {
            data?: { code?: string };
            statusMessage?: string;
        } | null;
        const code = h3Err?.data?.code;

        if (code === "USER_NOT_FOUND") {
            errorEmail.value = "No account found for this email.";
        } else if (code === "WRONG_PASSWORD") {
            errorPassword.value = "Wrong password.";
        } else {
            errorGeneral.value =
                h3Err?.statusMessage ??
                "Login failed. Please check your credentials.";
        }
        logger.error("Login error:", error);
    } finally {
        isSubmitting.value = false;
    }
}
</script>

<template>
    <div class="auth-page">
        <h1 class="auth-brand">Klankern</h1>

        <div class="auth-card">
            <h2>Sign in</h2>

            <form @submit.prevent="submitLoginForm">
                <div class="auth-field">
                    <input-base
                        v-model="email"
                        input-name="email"
                        input-type="email"
                        input-mode="email"
                        input-autocomplete="email"
                        :is-required="true"
                        :error="errorEmail"
                    >
                        <template #label>Email</template>
                    </input-base>
                </div>

                <div class="auth-field">
                    <input-base
                        v-model="password"
                        input-name="password"
                        input-type="password"
                        input-autocomplete="current-password"
                        :is-required="true"
                        :error="errorPassword"
                    >
                        <template #label>Password</template>
                    </input-base>
                </div>

                <div
                    v-if="errorGeneral"
                    class="auth-error-general"
                    role="alert"
                >
                    {{ errorGeneral }}
                </div>

                <button-base
                    type="submit"
                    variant="primary"
                    :disabled="isSubmitting"
                    class="auth-cta"
                >
                    {{ isSubmitting ? "Signing in…" : "Sign in" }}
                </button-base>
            </form>

            <p class="auth-secondary-link">
                Don't have an account?
                <nuxt-link to="/auth/register">Create one</nuxt-link>
            </p>
        </div>
    </div>
</template>

<style scoped>
.auth-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    padding: var(--spacing-lg) var(--spacing-md);
}

.auth-brand {
    font-size: var(--font-xl);
    font-weight: bold;
    color: var(--color-primary);
    text-align: center;
    margin-bottom: var(--spacing-md);
}

.auth-card {
    background: var(--color-background);
    border: var(--border-base);
    border-radius: var(--radius-sm);
    padding: var(--spacing-lg);
    max-width: 420px;
    width: 100%;
}

.auth-card h2 {
    font-size: var(--font-lg);
    font-weight: normal;
    color: var(--color-text);
    margin-bottom: var(--spacing-md);
}

.auth-field {
    margin-bottom: var(--spacing-md);
}

.auth-error-general {
    color: var(--color-error);
    font-size: var(--font-sm);
    margin-bottom: var(--spacing-md);
}

.auth-cta {
    width: 100%;
    margin-top: var(--spacing-sm);
}

.auth-secondary-link {
    text-align: center;
    margin-top: var(--spacing-md);
    font-size: var(--font-sm);
    color: var(--color-text-grey);
}

@media (max-width: 480px) {
    .auth-card {
        max-width: 100%;
        border: none;
        border-radius: 0;
        padding: var(--spacing-md);
    }

    .auth-page {
        padding: var(--spacing-md);
    }
}
</style>
