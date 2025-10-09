<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useFamilyStore } from "~/stores/families";
import { definePageMeta } from "#imports";

// Define component-specific metadata
definePageMeta({
    middleware: ["auth"], // Ensure only authenticated users can access this page
});

const route = useRoute();
const familyStore = useFamilyStore();

// Get reactive state and getters from the store
const { isLoading, error, familyName, members, isManager, isSendingInvite } =
    storeToRefs(familyStore);

const familyId = Array.isArray(route.params.id)
    ? route.params.id[0]
    : route.params.id;

const showInviteForm = ref(false);
const inviteeEmail = ref("");
const invitationSent = ref(false);

// Fetch the family data when the component is mounted
onMounted(() => {
    if (familyId) {
        familyStore.fetchFamily(familyId);
    }
});

async function handleSendInvitation() {
    if (!familyId || !inviteeEmail.value) return;

    const success = await familyStore.sendInvitation(
        familyId,
        inviteeEmail.value,
    );

    if (success) {
        invitationSent.value = true;
        inviteeEmail.value = "";
        showInviteForm.value = false;
        // Optionally hide the success message after a few seconds
        setTimeout(() => (invitationSent.value = false), 5000);
    }
}
</script>

<template>
    <div>
        <div v-if="isLoading">
            <p>Loading family details...</p>
        </div>

        <div v-else-if="error && !invitationSent">
            <p class="error-message">Error: {{ error }}</p>
            <nuxt-link to="/families">Go back to your families</nuxt-link>
        </div>

        <div v-else-if="familyStore.currentFamily">
            <header>
                <h1>{{ familyName }}</h1>
                <div v-if="isManager" class="actions">
                    <button-base @click="showInviteForm = !showInviteForm">
                        {{ showInviteForm ? "Cancel" : "Invite Member" }}
                    </button-base>
                </div>
            </header>

            <div v-if="invitationSent" class="success-message">
                <p>Invitation sent successfully!</p>
            </div>

            <form
                v-if="isManager && showInviteForm"
                class="invite-form"
                @submit.prevent="handleSendInvitation"
            >
                <h3>Invite a New Member</h3>
                <div>
                    <label for="inviteeEmail">Email Address</label>
                    <input
                        id="inviteeEmail"
                        v-model="inviteeEmail"
                        type="email"
                        placeholder="e.g., new.member@example.com"
                        :disabled="isSendingInvite"
                        required
                    />
                </div>
                <button-base type="submit" :disabled="isSendingInvite">
                    {{ isSendingInvite ? "Sending..." : "Send Invitation" }}
                </button-base>
                <div v-if="error" class="error-message">
                    <p>{{ error }}</p>
                </div>
            </form>

            <section id="members">
                <h2>Members</h2>
                <!-- 
                    Placeholder for the FamilyMembersList component.
                    This will be created in the next step.
                -->
                <ul>
                    <li v-for="member in members" :key="member.userId">
                        {{ member.displayName || member.username }} ({{
                            member.role
                        }})
                    </li>
                </ul>
            </section>
        </div>
    </div>
</template>

<style scoped>
.error-message {
    color: red;
}
.success-message {
    color: green;
    border: 1px solid green;
    padding: 1rem;
    margin-bottom: 1rem;
}
header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}
.invite-form {
    margin-bottom: 2rem;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}
.invite-form div {
    margin-bottom: 1rem;
}
</style>
