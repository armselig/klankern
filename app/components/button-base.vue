<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        disabled?: boolean;
        id?: string;
        type?: "button" | "submit" | "reset";
        /** Visual style variant. Defaults to "primary". */
        variant?: "primary" | "secondary";
    }>(),
    {
        type: "button",
        id: undefined,
        variant: "primary",
    },
);

const emit = defineEmits<(e: "click") => void>();

function emitEvent() {
    emit("click");
}
</script>

<template>
    <button
        :id="props.id"
        :type="props.type"
        :disabled="props.disabled"
        :class="`button-base button-base--${props.variant}`"
        @click="emitEvent"
    >
        <slot>Button</slot>
    </button>
</template>

<style>
@layer components {
    .button-base {
        border-radius: var(--radius-sm, 4px);
        padding: var(--spacing-base);
        min-height: 44px;
        cursor: pointer;
        font-size: var(--font-md);
        border: 1px solid transparent;
    }

    .button-base--primary {
        background: var(--color-primary);
        color: var(--color-text-invert);
        border-color: var(--color-primary);
    }

    .button-base--primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .button-base--secondary {
        background: transparent;
        color: var(--color-primary);
        border-color: var(--color-primary);
    }

    .button-base--secondary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
}
</style>
