<script lang="ts" setup>
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useFamilyStore } from "~/stores/families";

// Define component-specific metadata
definePageMeta({
    middleware: ["auth"], // Ensure only authenticated users can access this page
});

const route = useRoute();
const familyStore = useFamilyStore();

// Get reactive state and getters from the store
const { isLoading, error, familyName, members, isManager } =
    storeToRefs(familyStore);

const familyId = Array.isArray(route.params.id)
    ? route.params.id[0]
    : route.params.id;

// Fetch the family data when the component is mounted
onMounted(() => {
    if (familyId) {
        familyStore.fetchFamily(familyId);
    }
});

function handleInvite() {
    // TODO: Implement invite member modal or navigation
    alert("Invite member functionality to be implemented.");
}
</script>

<template>
    <div>
        <div v-if="isLoading">
            <p>Loading family details...</p>
        </div>

        <div v-else-if="error">
            <p class="error-message">Error: {{ error }}</p>
            <nuxt-link to="/families">Go back to your families</nuxt-link>
        </div>

        <div v-else-if="familyStore.currentFamily">
            <header>
                <h1>{{ familyName }}</h1>
                <div v-if="isManager" class="actions">
                    <button-base @click="handleInvite"
                        >Invite Member</button-base
                    >
                </div>
            </header>

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

header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}
</style>
