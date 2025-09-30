<template>
    <div>
        <header>
            <span>Klankern</span>
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

const logger = useLogger();
const authStore = useAuthStore();
const { isLoggedIn } = storeToRefs(authStore);

async function handleLogout() {
    logger.info("Logout");
    await authStore.logout();
}

function handleLogin() {
    navigateTo("/auth/login");
}
</script>
