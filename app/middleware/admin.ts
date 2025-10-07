import {
    defineNuxtRouteMiddleware,
    navigateTo,
    useUserSession,
} from "#imports";

export default defineNuxtRouteMiddleware(async () => {
    const { loggedIn, user } = await useUserSession(); // Await useUserSession

    if (!loggedIn.value) {
        return void navigateTo("/auth/login");
    }

    const isAdmin = user.value?.roles.some((role) => role.name === "admin");

    if (!isAdmin) {
        return void navigateTo("/"); // Or a dedicated /forbidden page
    }
});
