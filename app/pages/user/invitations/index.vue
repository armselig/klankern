<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useInvitationStore } from "~/stores/invitations";
import { definePageMeta } from "#imports";

// Define component-specific metadata
definePageMeta({
    middleware: ["auth"], // Ensure only authenticated users can access this page
});

const store = useInvitationStore();
const { pendingInvitations, isLoading, error } = storeToRefs(store);

// To track which specific invitation is being processed
const processingToken = ref<string | null>(null);

onMounted(() => {
    store.fetchPendingInvitations();
});

async function handleAccept(token: string) {
    processingToken.value = token;
    await store.acceptInvitation(token);
    processingToken.value = null;
    // The store action already removes the item from the list, so the UI will update automatically.
}

async function handleDecline(token: string) {
    processingToken.value = token;
    await store.declineInvitation(token);
    processingToken.value = null;
}
</script>

<template>
    <div>
        <h1>Your Invitations</h1>

        <div v-if="isLoading">
            <p>Loading invitations...</p>
        </div>

        <div v-else-if="error">
            <p class="error-message">Error: {{ error }}</p>
        </div>

        <div v-else-if="pendingInvitations.length === 0">
            <p>You have no pending invitations.</p>
        </div>

        <ul v-else class="invitation-list">
            <li
                v-for="invitation in pendingInvitations"
                :key="invitation.token"
                class="invitation-card"
            >
                <p>
                    You have been invited to join the
                    <strong>{{ invitation.family.name }}</strong> family by
                    <strong>{{
                        invitation.invitedByUser.display_name ||
                        invitation.invitedByUser.username
                    }}</strong
                    >.
                </p>
                <div class="actions">
                    <button-base
                        :disabled="processingToken === invitation.token"
                        @click="handleAccept(invitation.token)"
                    >
                        {{
                            processingToken === invitation.token
                                ? "Processing..."
                                : "Accept"
                        }}
                    </button-base>
                    <button-base
                        variant="secondary"
                        :disabled="processingToken === invitation.token"
                        @click="handleDecline(invitation.token)"
                    >
                        Decline
                    </button-base>
                </div>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.error-message {
    color: red;
}

.invitation-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.invitation-card {
    border: 1px solid #ccc;
    padding: 1rem;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.actions {
    display: flex;
    gap: 0.5rem;
}
</style>
