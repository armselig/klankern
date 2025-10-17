<!-- eslint-disable vuejs-accessibility/form-control-has-label -->
<template>
    <div class="input">
        <label :for="inputId" class="input__label">
            <slot name="label">Label is required!</slot>
            <span>{{ isRequiredMarker }}</span>
        </label>
        <input
            :id="inputId"
            :name="inputName"
            :placeholder="inputPlaceholder"
            :required="isRequired"
            :type="inputType"
            :value="inputValue"
            class="input__element"
        />
        <span v-if="$slots.description" class="input__desc">
            <slot name="description"></slot>
        </span>
        <output :for="inputId" class="input__status"></output>
    </div>
</template>

<script setup lang="ts">
// TODO: add validators
const {
    inputType = "text",
    isRequired = false,
    isRequiredMarker = "*",
} = defineProps<{
    inputId: string;
    inputName: string;
    inputPlaceholder?: string;
    inputType?: string;
    inputValue?: string;
    isRequired?: boolean;
    isRequiredMarker?: string;
}>();
</script>

<style lang="css">
@layer components {
    .input__element {
        border: var(--border-base);
        padding: var(--spacing-base);
    }
}
</style>
