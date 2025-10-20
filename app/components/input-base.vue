<!-- eslint-disable vuejs-accessibility/form-control-has-label -->
<template>
    <div class="input">
        <label :for="inputId" class="input__label">
            <slot name="label">Label is required!</slot>
            <span v-if="isRequired" class="input__required">{{
                requiredMarker
            }}</span>
        </label>
        <span v-if="$slots.description" class="input__desc">
            <slot name="description"></slot>
        </span>
        <input
            :id="inputId"
            :autocomplete="inputAutocomplete"
            :disabled="isDisabled"
            :inputmode="inputMode"
            :name="inputName"
            :pattern="inputPattern"
            :placeholder="inputPlaceholder"
            :readonly="isReadonly"
            :required="isRequired"
            :type="inputType"
            :value="inputValue"
            class="input__element"
        />
        <output :for="inputId" class="input__status"></output>
    </div>
</template>

<script setup lang="ts">
// TODO: add validators
const {
    inputAutocomplete = "on",
    inputType = "text",
    isDisabled = false,
    isReadonly = false,
    isRequired = false,
    requiredMarker = "*",
} = defineProps<{
    inputAutocomplete?: string;
    inputId: string;
    inputMode?:
        | "text"
        | "none"
        | "tel"
        | "url"
        | "email"
        | "numeric"
        | "decimal"
        | "search";
    inputName: string;
    inputPattern?: string;
    inputPlaceholder?: string;
    inputType?: string;
    inputValue?: string;
    isDisabled?: boolean;
    isReadonly?: boolean;
    isRequired?: boolean;
    requiredMarker?: string;
}>();
</script>

<style lang="css">
@layer components {
    .input {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .input__desc {
        font-size: var(--font-sm);
        margin-bottom: var(--spacing-sm);
    }

    .input__element {
        border: var(--border-base);
        padding: var(--spacing-base);

        &:user-invalid {
            border-color: var(--color-error);
        }

        &:user-valid {
            border-color: var(--color-success);
        }
    }

    .input__label {
        font-weight: 600;
    }
}
</style>
