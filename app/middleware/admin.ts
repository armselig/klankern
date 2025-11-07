import {
    defineNuxtRouteMiddleware,
    navigateTo,
    useUserSession,
} from "#imports";
import type { UserResponse } from "#shared/types/user";

export default defineNuxtRouteMiddleware(async () => {
    const { loggedIn, user } = await useUserSession(); // Await useUserSession

    if (!loggedIn.value) {
        return await navigateTo("/auth/login");
    }

    const userValue = user.value;
    const isAdmin = userValue?.roles.some(
        (role: { id: string; name: string; description: string | null }) =>
            role.name === "admin",
    );

    if (!isAdmin) {
        return await navigateTo("/"); // Or a dedicated /forbidden page
    }
});
