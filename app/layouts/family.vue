<script setup lang="ts">
import { ref } from "vue";
import { useUserSession, useRuntimeConfig, navigateTo } from "#imports";
import { useAuth } from "#composables/useAuth";
import { useLogger } from "#composables/useLogger";

const {
    public: { appName, appVersion },
} = useRuntimeConfig();
const logger = useLogger();

const { loggedIn, user } = useUserSession();
const { logout } = useAuth();

const sessionUser = user.value as
    | { emailVerified?: boolean; email_verified?: boolean }
    | undefined;
// Support both camelCase (new sessions) and snake_case (legacy fallback)
const isEmailUnverified = !(
    sessionUser?.emailVerified ??
    sessionUser?.email_verified ??
    true
);

const isResending = ref(false);
const resendMessage = ref("");

async function handleLogout() {
    logger.info("Logout");
    await logout();
}

function handleLogin() {
    void navigateTo("/auth/login");
}

/**
 * Stub: triggers email verification resend.
 * TODO: email sending not yet implemented — token is generated server-side
 * but no email is dispatched until an SMTP integration is wired up.
 */
async function resendVerificationEmail() {
    isResending.value = true;
    resendMessage.value = "";
    try {
        await $fetch("/api/auth/send-verification", { method: "POST" });
        resendMessage.value = "Verification email sent.";
    } catch {
        resendMessage.value = "Something went wrong. Try again.";
    } finally {
        isResending.value = false;
        setTimeout(() => (resendMessage.value = ""), 5000);
    }
}
</script>

<template>
    <div id="body">
        <header>
            <template v-if="$route.path === '/'">
                <span>{{ appName }} v{{ appVersion }}</span>
            </template>
            <template v-else>
                <nuxt-link to="/">{{ appName }} v{{ appVersion }}</nuxt-link>
            </template>

            <client-only>
                <span v-if="loggedIn && user" class="user-name"
                    >hallo,
                    {{
                        (user as { display_name?: string; username?: string })
                            .display_name ||
                        (user as { username?: string }).username ||
                        "user"
                    }}</span
                >
                <button-base v-if="loggedIn" @click="handleLogout">
                    Logout
                </button-base>
                <button-base v-else @click="handleLogin"> Login </button-base>
                <template #placeholder>
                    <button-base disabled>Logout</button-base>
                </template>
            </client-only>
        </header>

        <!-- Email verification nudge — non-blocking, non-dismissible -->
        <div v-if="isEmailUnverified" class="email-verify-nudge" role="status">
            <span>Verify your email to stay secure.</span>
            <button
                type="button"
                class="email-verify-resend"
                :disabled="isResending"
                @click="resendVerificationEmail"
            >
                {{ isResending ? "Sending…" : "Resend" }}
            </button>
            <span v-if="resendMessage" class="email-verify-feedback">
                {{ resendMessage }}
            </span>
        </div>

        <main>
            <nuxt-route-announcer />
            <nuxt-page />
        </main>
        <footer>Good luck!</footer>
    </div>
</template>

<style>
@layer layout {
    #body {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
    }

    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    footer {
        margin-top: auto;
    }
}
</style>

<style scoped>
.email-verify-nudge {
    background: #fffbe6;
    border-bottom: 1px solid #ffe58f;
    padding: var(--spacing-sm) var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: var(--font-sm);
    width: 100%;
}

.email-verify-resend {
    background: none;
    border: none;
    color: var(--color-primary);
    cursor: pointer;
    font-size: var(--font-sm);
    text-decoration: underline;
    padding: 0;
}

.email-verify-resend:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.email-verify-feedback {
    color: var(--color-text-grey);
}
</style>
