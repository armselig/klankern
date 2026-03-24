<script lang="ts" setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useFamilyStore } from "~/stores/families";
import { storeToRefs } from "pinia";
import { definePageMeta } from "#imports";
import { useUserSession } from "#imports";

definePageMeta({
    middleware: ["auth"],
    layout: "family",
});

const router = useRouter();
const familyStore = useFamilyStore();
const { fetch: refreshSession } = useUserSession();

const { isCreating, error } = storeToRefs(familyStore);

const familyName = ref("");

async function handleCreateFamily() {
    if (!familyName.value.trim()) {
        familyStore.error = "Family name cannot be empty.";
        return;
    }

    const newFamily = await familyStore.createFamily(familyName.value);

    if (newFamily && newFamily.id) {
        // Refresh session BEFORE navigating so client middleware sees the new
        // family and doesn't redirect back to /auth/onboarding (redirect loop fix).
        await refreshSession();
        await router.push(`/families/${newFamily.id}`);
    }
}
</script>

<template>
    <div>
        <h1>Create a New Family</h1>
        <form @submit.prevent="handleCreateFamily">
            <div>
                <label for="familyName">Family Name</label>
                <input
                    id="familyName"
                    v-model="familyName"
                    type="text"
                    placeholder="e.g., The Cool Family"
                    :disabled="isCreating"
                    required
                />
            </div>

            <button-base type="submit" :disabled="isCreating">
                {{ isCreating ? "Creating..." : "Create Family" }}
            </button-base>

            <div v-if="error" class="error-message">
                <p>Error: {{ error }}</p>
            </div>
        </form>

        <auth-progress-dots :current-step="3" :total-steps="3" />
    </div>
</template>

<style scoped>
.error-message {
    color: var(--color-error);
    margin-top: var(--spacing-sm);
}
</style>
