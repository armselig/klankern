<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { navigateTo, definePageMeta } from "#imports";
import { useAuth } from "#composables/useAuth";
import { useLogger } from "#composables/useLogger";

definePageMeta({ layout: "default" });

const route = useRoute();
const { register } = useAuth();
const logger = useLogger();

// Invite flow state
const inviteToken = ref<string | null>(null);
const inviteFamilyName = ref<string | null>(null);
const inviteLoading = ref(false);

// Form state
const name = ref("");
const email = ref("");
const password = ref("");
const isSubmitting = ref(false);

// Error state
const errorGeneral = ref("");
const errorName = ref("");
const errorEmail = ref("");
const errorPassword = ref("");
const errorInvite = ref("");

const ctaLabel = computed(() =>
    isSubmitting.value
        ? "Creating account…"
        : inviteFamilyName.value
          ? `Join ${inviteFamilyName.value}`
          : "Create account",
);

const isFounderPath = computed(() => !inviteToken.value);

/**
 * Fetches invite metadata on mount if a ?token= query param is present.
 * Failure is non-blocking: the form renders as a cold registration.
 */
async function loadInviteMetadata(token: string) {
    inviteLoading.value = true;
    try {
        const data = await $fetch<{ familyName: string }>(
            `/api/invitations/metadata/${token}`,
        );
        inviteFamilyName.value = data.familyName;
        inviteToken.value = token;
    } catch (err) {
        logger.warn(
            "Could not load invite metadata — rendering as cold registration.",
            err,
        );
        // Token stays null; form renders without invite banner
    } finally {
        inviteLoading.value = false;
    }
}

onMounted(() => {
    const token = route.query.token;
    if (token && typeof token === "string") {
        void loadInviteMetadata(token);
    }
});

function clearErrors() {
    errorGeneral.value = "";
    errorName.value = "";
    errorEmail.value = "";
    errorPassword.value = "";
    errorInvite.value = "";
}

async function submitRegisterForm() {
    clearErrors();

    // Basic client-side validation
    if (!name.value.trim()) {
        errorName.value = "Name is required.";
        return;
    }
    if (!email.value.trim()) {
        errorEmail.value = "Email is required.";
        return;
    }
    if (password.value.length < 8) {
        errorPassword.value = "Password must be at least 8 characters.";
        return;
    }

    isSubmitting.value = true;
    const result = await register({
        name: name.value.trim(),
        email: email.value.trim(),
        password: password.value,
        inviteToken: inviteToken.value ?? undefined,
    });
    isSubmitting.value = false;

    if (!result.success) {
        const code = result.code;
        if (code === "EMAIL_TAKEN") {
            errorEmail.value =
                "An account with this email already exists. Sign in instead.";
        } else if (code === "INVITE_EXPIRED") {
            errorInvite.value =
                "This invite link has expired. Ask the family member who sent it to send a new one.";
        } else if (code === "INVITE_EMAIL_MISMATCH") {
            errorInvite.value =
                "This invite was sent to a different email address.";
        } else {
            errorGeneral.value = result.error;
        }
        return;
    }

    if (result.familyId) {
        await navigateTo(`/families/${result.familyId}`);
    } else {
        await navigateTo("/auth/onboarding");
    }
}
</script>

<template>
    <div class="auth-page">
        <h1 class="auth-brand">Klankern</h1>

        <div class="auth-card">
            <!-- Invite banner: shown only when a valid invite token is present -->
            <div
                v-if="inviteFamilyName"
                class="auth-invite-banner"
                role="status"
            >
                You've been invited to join
                <strong>{{ inviteFamilyName }}</strong
                >.
            </div>

            <!-- Invite error banner (expired / mismatched) -->
            <div v-if="errorInvite" class="auth-error-banner" role="alert">
                {{ errorInvite }}
            </div>

            <h2>Create your account</h2>

            <form @submit.prevent="submitRegisterForm">
                <div class="auth-field">
                    <input-base
                        v-model="name"
                        input-name="name"
                        input-type="text"
                        input-autocomplete="name"
                        :is-required="true"
                        :error="errorName"
                    >
                        <template #label>Name</template>
                    </input-base>
                </div>

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
                        input-autocomplete="new-password"
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
                    {{ ctaLabel }}
                </button-base>
            </form>

            <p class="auth-secondary-link">
                Already have an account?
                <nuxt-link to="/auth/login">Sign in</nuxt-link>
            </p>
        </div>

        <auth-progress-dots
            v-if="isFounderPath"
            :current-step="1"
            :total-steps="3"
        />
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

.auth-invite-banner {
    background: #fffbe6;
    border: 1px solid #ffe58f;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    margin: calc(-1 * var(--spacing-lg)) calc(-1 * var(--spacing-lg))
        var(--spacing-md);
    font-size: var(--font-sm);
}

.auth-error-banner {
    background: #fff2f0;
    border: 1px solid #ffccc7;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-md);
    font-size: var(--font-sm);
    color: var(--color-error);
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
