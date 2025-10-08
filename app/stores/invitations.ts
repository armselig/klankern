import { defineStore } from "pinia";
import { ref } from "vue";

// Define an interface for the invitation object for type safety
interface PendingInvitation {
    id: string;
    token: string;
    family: {
        name: string;
    };
    invitedByUser: {
        display_name: string | null;
        username: string;
    };
    created_at: string; // Assuming it comes as an ISO string
}

function isH3Error(error: unknown): error is { data: { message: string } } {
    return typeof error === "object" && error !== null && "data" in error;
}

export const useInvitationStore = defineStore("invitation", () => {
    // State
    const pendingInvitations = ref<PendingInvitation[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // Actions
    async function fetchPendingInvitations() {
        isLoading.value = true;
        error.value = null;
        try {
            const data = await $fetch<PendingInvitation[]>("/api/invitations");
            pendingInvitations.value = data;
        } catch (e: unknown) {
            if (isH3Error(e)) {
                error.value = e.data.message;
            } else {
                error.value =
                    "An unexpected error occurred while fetching invitations.";
            }
        }
    }

    async function acceptInvitation(token: string): Promise<boolean> {
        try {
            await $fetch(`/api/invitations/${token}/accept`, {
                method: "POST",
            });
            // On success, remove the invitation from the local state
            pendingInvitations.value = pendingInvitations.value.filter(
                (inv) => inv.token !== token,
            );
            return true;
        } catch (e: unknown) {
            if (isH3Error(e)) {
                error.value = e.data.message;
            } else {
                error.value = "Failed to accept the invitation.";
            }
            return false;
        }
    }

    async function declineInvitation(token: string): Promise<boolean> {
        try {
            await $fetch(`/api/invitations/${token}/decline`, {
                method: "POST",
            });
            // On success, remove the invitation from the local state
            pendingInvitations.value = pendingInvitations.value.filter(
                (inv) => inv.token !== token,
            );
            return true;
        } catch (e: unknown) {
            if (isH3Error(e)) {
                error.value = e.data.message;
            } else {
                error.value = "Failed to decline the invitation.";
            }
            return false;
        }
    }

    return {
        pendingInvitations,
        isLoading,
        error,
        fetchPendingInvitations,
        acceptInvitation,
        declineInvitation,
    };
});
