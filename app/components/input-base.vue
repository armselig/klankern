<template>
    <div class="input" :class="{ 'input--required': isRequired }">
        <template v-if="inputType !== 'checkbox'">
            <label :for="inputId" class="input__label">
                <slot name="label">Label is required!</slot>
                <span class="input__required">{{ requiredMarker }}</span>
            </label>
            <span :id="descId" class="input__desc">
                <slot name="description"></slot>
            </span>
            <input
                :id="inputId"
                :aria-describedby="descId"
                :autocomplete="inputAutocomplete"
                :disabled="isDisabled"
                :inputmode="inputMode"
                :name="inputName"
                :pattern="inputPattern"
                :placeholder="inputPlaceholder"
                :readonly="isReadonly"
                :required="isRequired"
                :type="inputType"
                :value="modelValue"
                class="input__element"
                @input="updateValue"
            />
        </template>
        <template v-else>
            <label :for="inputId" class="input__label">
                <input
                    :id="inputId"
                    :aria-describedby="descId"
                    :disabled="isDisabled"
                    :name="inputName"
                    :readonly="isReadonly"
                    :required="isRequired"
                    type="checkbox"
                    :checked="modelValue"
                    class="input__element"
                    @change="updateCheckedValue"
                />
                <slot name="label">Label is required!</slot>
                <span class="input__required">{{ requiredMarker }}</span>
            </label>
            <span :id="descId" class="input__desc">
                <slot name="description"></slot>
            </span>
        </template>
        <output
            v-if="error"
            :for="inputId"
            class="input__status"
            aria-label="Validation error"
        >
            {{ error }}
        </output>
    </div>
</template>

<script setup lang="ts">
import { defineProps, useSlots, defineEmits } from "vue";

const {
    inputAutocomplete = "on",
    inputId = `input-${Date.now()}`,
    inputMode = "text",
    inputPattern = "",
    inputPlaceholder = "",
    inputType = "text",
    isDisabled = false,
    isReadonly = false,
    isRequired = false,
    requiredMarker = "*",
    modelValue = "",
    error = "",
} = defineProps<{
    inputAutocomplete?: string;
    inputId?: string;
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
    modelValue?: string | number | boolean;
    isDisabled?: boolean;
    isReadonly?: boolean;
    isRequired?: boolean;
    requiredMarker?: string;
    error?: string;
}>();

const emit = defineEmits(["update:modelValue"]);

function updateValue(event: Event) {
    emit("update:modelValue", (event.target as HTMLInputElement).value);
}

function updateCheckedValue(event: Event) {
    emit("update:modelValue", (event.target as HTMLInputElement).checked);
}

const slots = useSlots();
const descId = !!slots.description ? `${inputId}Desc` : undefined;
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

        &:empty {
            display: none;
        }
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

    .input__required {
        display: none;

        .input--required & {
            display: inline;
        }
    }
}
</style>
