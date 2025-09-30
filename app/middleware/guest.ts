import { defineNuxtRouteMiddleware, navigateTo } from "#app";
import { useAuthStore } from "~/stores/auth";

export default defineNuxtRouteMiddleware((to, from) => {
    const authStore = useAuthStore();
    if (authStore.isLoggedIn) {
        return navigateTo("/"); // Redirect to home page if already logged in
    }
});
