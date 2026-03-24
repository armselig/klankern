<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { navigateTo, definePageMeta } from "#imports";
import { useUserSession } from "#imports";
import { useLogger } from "#composables/useLogger";

definePageMeta({ middleware: ["auth"] });

const route = useRoute();
const { fetch: refreshSession, user } = useUserSession();
const logger = useLogger();

const token = Array.isArray(route.query.token)
    ? (route.query.token[0] ?? null)
    : (route.query.token ?? null);

const familyName = ref<string | null>(null);
const isLoadingMeta = ref(true);
const isTokenInvalid = ref(false);
const isAccepting = ref(false);
const isDeclining = ref(false);
const acceptError = ref("");

/**
 * Fetches the family name for display via the public metadata endpoint.
 * Renders the invalid-token state if the token is expired, not found, or malformed.
 */
async function loadInviteMetadata() {
    if (!token) {
        isTokenInvalid.value = true;
        isLoadingMeta.value = false;
        return;
    }
    try {
        const data = await $fetch<{ familyName: string }>(
            `/api/invitations/metadata/${token}`,
        );
        familyName.value = data.familyName;
    } catch {
        isTokenInvalid.value = true;
    } finally {
        isLoadingMeta.value = false;
    }
}

onMounted(() => {
    void loadInviteMetadata();
});

async function acceptInvite() {
    if (!token) return;
    acceptError.value = "";
    isAccepting.value = true;
    try {
        await $fetch(`/api/invitations/${token}/accept`, { method: "POST" });
        await refreshSession();

        const sessionUser = user.value as
            | { families?: Array<{ id: string }> }
            | undefined;
        const families = sessionUser?.families ?? [];

        if (families.length > 0) {
            await navigateTo(`/families/${families[0]!.id}`);
        } else {
            await navigateTo("/auth/onboarding");
        }
    } catch (err: unknown) {
        logger.error("Failed to accept invitation:", err);
        const h3Err = err as {
            data?: { code?: string };
            statusMessage?: string;
        } | null;
        const code = h3Err?.data?.code;
        if (code === "INVITE_EXPIRED") {
            isTokenInvalid.value = true;
        } else {
            acceptError.value =
                h3Err?.statusMessage ??
                "Something went wrong. Please try again.";
        }
    } finally {
        isAccepting.value = false;
    }
}

async function declineInvite() {
    if (!token) return;
    isDeclining.value = true;
    try {
        await $fetch(`/api/invitations/${token}/decline`, { method: "POST" });
    } catch {
        // Best-effort decline; navigate away regardless
    }
    await navigateTo("/auth/onboarding");
}
</script>

<template>
    <div class="auth-page">
        <h1 class="auth-brand">Klankern</h1>

        <div v-if="isLoadingMeta" class="auth-card">
            <p class="auth-loading">Loading invitation…</p>
        </div>

        <!-- Invalid / expired token state -->
        <div v-else-if="isTokenInvalid" class="auth-card">
            <h2>This invite link is no longer valid.</h2>
            <p class="auth-supporting-copy">
                Ask the family member who sent it to send a new one.
            </p>
            <button-base
                type="button"
                variant="secondary"
                class="auth-cta"
                @click="navigateTo('/auth/login')"
            >
                Go to sign in
            </button-base>
        </div>

        <!-- Valid invite state -->
        <div v-else class="auth-card">
            <h2>You've been invited to join {{ familyName }}.</h2>
            <p class="auth-supporting-copy">
                {{ familyName }} is a family on Klankern. Accept to join them.
            </p>

            <div v-if="acceptError" class="auth-error-general" role="alert">
                {{ acceptError }}
            </div>

            <button-base
                type="button"
                variant="primary"
                class="auth-cta"
                :disabled="isAccepting"
                @click="acceptInvite"
            >
                {{ isAccepting ? "Accepting…" : "Accept invitation" }}
            </button-base>

            <div class="auth-decline-row">
                <button
                    type="button"
                    class="auth-decline-link"
                    :disabled="isDeclining"
                    @click="declineInvite"
                >
                    Decline
                </button>
            </div>
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
    margin-bottom: var(--spacing-sm);
}

.auth-loading {
    color: var(--color-text-grey);
    font-size: var(--font-sm);
}

.auth-supporting-copy {
    color: var(--color-text-grey);
    font-size: var(--font-sm);
    margin-bottom: var(--spacing-lg);
}

.auth-cta {
    width: 100%;
    margin-top: var(--spacing-sm);
}

.auth-error-general {
    color: var(--color-error);
    font-size: var(--font-sm);
    margin-bottom: var(--spacing-sm);
}

.auth-decline-row {
    text-align: center;
    margin-top: var(--spacing-md);
}

.auth-decline-link {
    background: none;
    border: none;
    color: var(--color-text-grey);
    cursor: pointer;
    font-size: var(--font-sm);
    text-decoration: underline;
}

.auth-decline-link:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
