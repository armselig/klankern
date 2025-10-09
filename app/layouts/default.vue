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
                <span v-if="loggedIn" class="user-name"
                    >hallo, {{ user.name }}</span
                >
                <button-base v-if="loggedIn" @click="handleLogout">
                    Logout
                </button-base>
                <button-base v-else @click="handleLogin"> Login </button-base>
                <template #placeholder>
                    <button-base disabled>Logiut</button-base>
                </template>
            </client-only>
        </header>
        <main>
            <nuxt-route-announcer />
            <nuxt-page />
        </main>
        <footer>Good luck!</footer>
    </div>
</template>

<script setup lang="ts">
import { useRuntimeConfig, navigateTo, useUserSession } from "#imports";
import { useAuth } from "#composables/useAuth";
import { useLogger } from "#composables/useLogger";

const {
    public: { appName, appVersion },
} = useRuntimeConfig();
const logger = useLogger();

const { loggedIn, user } = useUserSession();
const { logout } = useAuth();

async function handleLogout() {
    logger.info("Logout");
    await logout();
}

function handleLogin() {
    void navigateTo("/auth/login");
}
</script>

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
        /* and STAY down! */
    }
}
</style>
