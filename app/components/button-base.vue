<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        disabled?: boolean;
        id?: string;
        type?: "button" | "submit" | "reset";
    }>(),
    {
        type: "button",
        id: undefined,
    },
);

const emit = defineEmits<{
    (e: "click"): void;
}>();

function emitEvent() {
    emit("click");
}
</script>

<template>
    <button
        :[id]="props.id"
        :type="props.type"
        :disabled="props.disabled"
        @click="emitEvent"
    >
        <slot>Button</slot>
    </button>
</template>
