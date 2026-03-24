<script setup lang="ts">
const props = defineProps<{
    /** Current step (1-based) */
    currentStep: number;
    /** Total number of steps */
    totalSteps: number;
}>();
</script>

<template>
    <div
        class="auth-progress-dots"
        role="status"
        :aria-label="`Step ${props.currentStep} of ${props.totalSteps}`"
    >
        <span
            v-for="step in props.totalSteps"
            :key="step"
            class="auth-progress-dots__dot"
            :class="{
                'auth-progress-dots__dot--active': step === props.currentStep,
            }"
        ></span>
    </div>
</template>

<style scoped>
.auth-progress-dots {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-top: var(--spacing-md);
}

.auth-progress-dots__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-border);
}

.auth-progress-dots__dot--active {
    background: var(--color-primary);
}
</style>
