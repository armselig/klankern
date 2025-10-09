<script lang="ts" setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useFamilyStore } from "~/stores/families";
import { storeToRefs } from "pinia";
import { definePageMeta } from "#imports";

// Define component-specific metadata
definePageMeta({
    middleware: ["auth"], // Ensure only authenticated users can access this page
});

const router = useRouter();
const familyStore = useFamilyStore();

// Use storeToRefs to keep reactivity on state and getters
const { isCreating, error } = storeToRefs(familyStore);

const familyName = ref("");

async function handleCreateFamily() {
    if (!familyName.value.trim()) {
        familyStore.error = "Family name cannot be empty.";
        return;
    }

    const newFamily = await familyStore.createFamily(familyName.value);

    if (newFamily && newFamily.id) {
        // Redirect to the new family's dashboard page
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
    </div>
</template>

<style scoped>
.error-message {
    color: red;
    margin-top: 1rem;
}
</style>
