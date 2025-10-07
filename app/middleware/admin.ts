import {
    defineNuxtRouteMiddleware,
    navigateTo,
    useUserSession,
} from "#imports";

export default defineNuxtRouteMiddleware(async () => {
    const { loggedIn, user } = useUserSession();

    if (!loggedIn.value) {
        return navigateTo("/auth/login");
    }

    const isAdmin = user.value?.roles.some((role) => role.name === "admin");

    if (!isAdmin) {
        return navigateTo("/"); // Or a dedicated /forbidden page
    }
});
