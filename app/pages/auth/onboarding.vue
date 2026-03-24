<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { navigateTo, definePageMeta } from "#imports";
import { useUserSession } from "#imports";

definePageMeta({ middleware: ["auth"] });

const { user } = useUserSession();

// Guard: if user already has a family, redirect to it.
// Uses onBeforeMount so this runs on client-side navigation and SSR alike
// without blocking the template render.
const sessionUser = computed(
    () => user.value as { families?: Array<{ id: string }> } | undefined,
);

onMounted(() => {
    const families = sessionUser.value?.families ?? [];
    if (families.length > 0) {
        void navigateTo(`/families/${families[0]!.id}`);
    }
});

const joinUrl = ref("");
const joinError = ref("");
const isJoining = ref(false);

const joinButtonDisabled = computed(
    () => !joinUrl.value.trim() || isJoining.value,
);

/**
 * Extracts the invite token from a pasted URL or raw token string,
 * then navigates to the invite acceptance page.
 */
async function handleJoinFamily() {
    joinError.value = "";

    let token: string | null = null;

    const input = joinUrl.value.trim();

    // Try to parse as URL and extract ?token= param
    try {
        const url = new URL(input);
        token = url.searchParams.get("token");
    } catch {
        // Not a URL — treat the entire input as a raw token
        if (input && !input.includes(" ")) {
            token = input;
        }
    }

    if (!token) {
        joinError.value = "That doesn't look like a valid invite link.";
        return;
    }

    isJoining.value = true;
    await navigateTo(`/invitations/accept?token=${encodeURIComponent(token)}`);
    isJoining.value = false;
}
</script>

<template>
    <div class="auth-page">
        <h1 class="auth-brand">Klankern</h1>

        <div class="auth-card">
            <h2>Set up your family</h2>
            <p class="auth-supporting-copy">
                Create a new family space or join one you've been invited to.
            </p>

            <button-base
                type="button"
                variant="primary"
                class="auth-cta"
                @click="navigateTo('/families/create')"
            >
                Create a new family
            </button-base>

            <div class="auth-divider" aria-hidden="true">
                <span>or</span>
            </div>

            <p class="auth-join-label">Paste your invite link:</p>
            <input-base
                v-model="joinUrl"
                input-name="invite-url"
                input-type="url"
                input-placeholder="https://..."
                input-autocomplete="off"
                :error="joinError"
                aria-label="Paste your invite link"
            >
                <template #label>Invite link</template>
            </input-base>

            <button-base
                type="button"
                variant="secondary"
                class="auth-cta auth-cta--join"
                :disabled="joinButtonDisabled"
                @click="handleJoinFamily"
            >
                {{ isJoining ? "Joining…" : "Join family" }}
            </button-base>
        </div>

        <auth-progress-dots :current-step="2" :total-steps="3" />
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

.auth-supporting-copy {
    color: var(--color-text-grey);
    font-size: var(--font-sm);
    margin-bottom: var(--spacing-lg);
}

.auth-cta {
    width: 100%;
    margin-top: var(--spacing-sm);
}

.auth-cta--join {
    margin-top: var(--spacing-sm);
}

.auth-divider {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin: var(--spacing-md) 0;
    color: var(--color-text-grey);
    font-size: var(--font-sm);
}

.auth-divider::before,
.auth-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--color-border);
}

.auth-join-label {
    font-size: var(--font-sm);
    color: var(--color-text);
    margin-bottom: var(--spacing-sm);
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
