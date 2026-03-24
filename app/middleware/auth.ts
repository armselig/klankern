import { defineNuxtRouteMiddleware, navigateTo } from "#app";
import { useUserSession } from "#imports";

/**
 * Client-side route guard for authentication and onboarding state.
 *
 * Rules:
 * 1. Not logged in → /auth/login
 * 2. Logged in but no families AND not on an /auth/* route,
 *    /families/create, or /invitations/accept → /auth/onboarding
 *    The null-coalesce (?? 0) handles old sessions that pre-date the
 *    families field being added to the session.
 */
export default defineNuxtRouteMiddleware((to) => {
    const { loggedIn, user } = useUserSession();

    if (!loggedIn.value) {
        return navigateTo("/auth/login");
    }

    const sessionUser = user.value as { families?: Array<unknown> } | undefined;
    const familyCount = sessionUser?.families?.length ?? 0;

    const isAuthRoute = to.path.startsWith("/auth/");
    const isFamilyCreate = to.path === "/families/create";
    const isInvitationAccept = to.path === "/invitations/accept";

    if (
        familyCount === 0 &&
        !isAuthRoute &&
        !isFamilyCreate &&
        !isInvitationAccept
    ) {
        return navigateTo("/auth/onboarding");
    }
});
