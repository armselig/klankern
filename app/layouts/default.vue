<template>
    <div id="body">
        <header>
            <template v-if="$route.path === '/'">
                <span>{{ appName }} v{{ appVersion }}</span>
            </template>
            <template v-else>
                <nuxt-link to="/">{{ appName }} v{{ appVersion }}</nuxt-link>
            </template>

            <nav v-if="isLoggedIn && isAdmin">
                <ul>
                    <li><nuxt-link to="/admin/users">Users</nuxt-link></li>
                    <li><nuxt-link to="/admin/roles">Roles</nuxt-link></li>
                </ul>
            </nav>

            <client-only>
                <button-base v-if="isLoggedIn" @click="handleLogout">
                    Logout
                </button-base>
                <button-base v-else @click="handleLogin"> Login </button-base>
                <template #placeholder>
                    <button-base disabled>...</button-base>
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
import { storeToRefs } from "pinia";
import { useAuthStore } from "~/stores/auth";

const {
    public: { appName, appVersion },
} = useRuntimeConfig();
const logger = useLogger();
const authStore = useAuthStore();
const { isLoggedIn, isAdmin } = storeToRefs(authStore);

async function handleLogout() {
    logger.info("Logout");
    await authStore.logout();
}

function handleLogin() {
    navigateTo("/auth/login");
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
