<script setup lang="ts">
defineProps<{
    disabled?: boolean;
}>();

const emit = defineEmits<{
    (e: "click"): void;
}>();

function handleClick() {
    emit("click");
}
</script>

<template>
    <button
        id="button-base"
        type="button"
        :disabled="disabled"
        @click="handleClick"
    >
        <slot>Button</slot>
    </button>
</template>
