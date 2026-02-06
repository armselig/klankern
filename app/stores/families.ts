import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useUserSession } from "#imports";

// Define interfaces for our state shape for type safety
interface FamilyMember {
    user_id: string;
    display_name: string | null;
    username: string;
    role: string;
}

interface FamilyDetails {
    id: string;
    name: string;
    members: FamilyMember[];
}

function isH3Error(error: unknown): error is { data: { message: string } } {
    return typeof error === "object" && error !== null && "data" in error;
}

export const useFamilyStore = defineStore("family", () => {
    // State
    const currentFamily = ref<FamilyDetails | null>(null);
    const isLoading = ref(false); // For fetching
    const isCreating = ref(false); // For creating
    const isSendingInvite = ref(false);
    const error = ref<string | null>(null);

    // Getters (as computed properties)
    const members = computed(() => currentFamily.value?.members || []);
    const familyName = computed(() => currentFamily.value?.name || "");

    // Get the current authenticated user from the session
    const { user: authUser } = useUserSession();

    const currentUserMembership = computed(() => {
        if (!authUser.value || !currentFamily.value) return null;
        return members.value.find(
            (member) => member.user_id === authUser.value?.id,
        );
    });

    const isManager = computed(() => {
        return currentUserMembership.value?.role === "manager";
    });

    // Actions
    async function fetchFamily(familyId: string) {
        isLoading.value = true;
        error.value = null;
        currentFamily.value = null; // Reset on new fetch

        try {
            const data = await $fetch<FamilyDetails>(
                `/api/families/${familyId}`,
            );
            currentFamily.value = data;
        } catch (e: unknown) {
            if (isH3Error(e)) {
                error.value = e.data.message;
            } else {
                error.value =
                    "An unexpected error occurred while fetching family details.";
            }
        } finally {
            isLoading.value = false;
        }
    }

    async function createFamily(name: string) {
        isCreating.value = true;
        error.value = null;
        try {
            const newFamily = await $fetch<FamilyDetails>("/api/families", {
                method: "POST",
                body: { name },
            });
            return newFamily;
        } catch (e: unknown) {
            if (isH3Error(e)) {
                error.value = e.data.message;
            } else {
                error.value =
                    "An unexpected error occurred while creating the family.";
            }
            return null;
        } finally {
            isCreating.value = false;
        }
    }

    async function sendInvitation(familyId: string, email: string) {
        isSendingInvite.value = true;
        error.value = null;
        try {
            await $fetch(`/api/families/${familyId}/invitations`, {
                method: "POST",
                body: { email },
            });
            // Optionally, refetch family data to show pending invitations
            // await fetchFamily(familyId);
            return true;
        } catch (e: unknown) {
            if (isH3Error(e)) {
                error.value = e.data.message;
            } else {
                error.value =
                    "An unexpected error occurred while sending the invitation.";
            }
            return false;
        } finally {
            isSendingInvite.value = false;
        }
    }

    return {
        // State
        currentFamily,
        isLoading,
        isCreating,
        isSendingInvite,
        error,
        // Getters
        members,
        familyName,
        isManager,
        // Actions
        fetchFamily,
        createFamily,
        sendInvitation,
    };
});
