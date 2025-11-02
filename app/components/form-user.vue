<template>
    <form class="form" @submit.prevent="submitForm">
        <fieldset>
            <legend class="heading">User Details</legend>
            <input-base
                v-model:model-value="formData.id"
                input-id="id"
                input-name="id"
                :is-readonly="true"
                :error="validation.id"
            >
                <template #label>User ID:</template>
                <template #description
                    >This is set automatically by the app and only relevant for
                    admins.</template
                >
            </input-base>
            <input-base
                v-model:model-value="formData.username"
                input-id="username"
                input-name="username"
                input-autocomplete="username"
                input-placeholder="DadJoke1981"
                :is-required="true"
                :error="validation.username"
                @blur="validateField('username')"
            >
                <template #label>Username:</template>
                <template #description
                    ><p>
                        You will use your username to log into the app. It is
                        not visible to other users if you set a display name.
                    </p>
                    <p><strong>Requirements:</strong></p>
                    <ul>
                        <li>Length between 4 and 10 characters</li>
                        <li>Alphanumeric characters only</li>
                    </ul></template
                >
            </input-base>
            <input-base
                v-model:model-value="formData.display_name"
                input-id="display_name"
                input-name="display_name"
                input-autocomplete="name"
                input-placeholder="Holger Holgersson III."
                :error="validation.display_name"
                @blur="validateField('display_name')"
            >
                <template #label>Display name:</template>
                <template #description
                    >Your display name will be shown on a all posts and entries
                    you make in this app. If you leave this empty, your username
                    will be used instead.</template
                >
            </input-base>
            <input-base
                v-model:model-value="formData.first_name"
                input-id="first_name"
                input-name="first_name"
                input-autocomplete="given-name"
                input-placeholder="Holger"
                :error="validation.first_name"
                @blur="validateField('first_name')"
            >
                <template #label>First name:</template>
            </input-base>
            <input-base
                v-model:model-value="formData.last_name"
                input-id="last_name"
                input-name="last_name"
                input-autocomplete="family-name"
                input-placeholder="Holgersson"
                :error="validation.last_name"
                @blur="validateField('last_name')"
            >
                <template #label>Last name:</template>
            </input-base>
            <input-base
                v-model:model-value="formData.email"
                input-id="email"
                input-mode="email"
                input-name="email"
                input-type="email"
                input-placeholder="dad@holgersson.family"
                :is-required="true"
                :error="validation.email"
                @blur="validateField('email')"
            >
                <template #label>Email:</template>
            </input-base>
            <input-base
                v-model:model-value="formData.is_active"
                input-id="is_active"
                input-name="is_active"
                input-type="checkbox"
                :error="validation.is_active"
            >
                <template #label>Is Active</template>
            </input-base>
        </fieldset>
        <fieldset>
            <legend class="heading">Roles</legend>
            <!-- TODO: Replace with a proper multi-select component for roles -->
            <input-base
                v-model:model-value="formData.roleIds"
                input-id="roleIds"
                input-name="roleIds"
                input-placeholder="e.g., uuid1, uuid2"
                :error="validation.roleIds"
                @blur="validateField('roleIds')"
            >
                <template #label>Role IDs (comma-separated):</template>
                <template #description
                    >Enter comma-separated UUIDs for roles.</template
                >
            </input-base>
        </fieldset>
        <fieldset>
            <legend class="heading">Password</legend>
            <input-base
                v-model:model-value="formData.password"
                input-id="password"
                input-name="password"
                input-type="password"
                :is-required="passwordRequired"
                :error="validation.password"
                @blur="validateField('password')"
            >
                <template #label>Password:</template>
            </input-base>
        </fieldset>
        <button-base class="form__submit" type="submit" :disabled="!formIsValid"
            >Submit</button-base
        >
        <button-base class="form__cancel" type="button" @click="cancelForm"
            >Cancel</button-base
        >
    </form>
</template>

<script setup lang="ts">
import type { ZodIssue } from "zod";
import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import { useLogger } from "#composables/useLogger";
import {
    updateUserFormSchema,
    type UpdateUserFormData,
    type UserResponse,
} from "#shared/types/user";
import type { FormValidation } from "#shared/types/form";

const logger = useLogger();
// const { roles: availableRoles } = useAdmin();

const props = defineProps<{
    user?: UserResponse;
    passwordRequired?: boolean;
}>();

const emit = defineEmits<{
    (e: "submit", payload: UpdateUserFormData): void;
    (e: "cancel"): void;
}>();

const initialFormData: UpdateUserFormData = {
    id: undefined,
    email: "",
    username: "",
    display_name: "",
    first_name: "",
    last_name: "",
    is_active: true,
    password: "",
    roleIds: [],
};

const formData: Ref<UpdateUserFormData> = ref({ ...initialFormData });
const validation: Ref<FormValidation<UpdateUserFormData>> = ref({});

watch(
    () => props.user,
    (newUser) => {
        if (newUser) {
            formData.value = {
                id: newUser.id,
                email: newUser.email,
                username: newUser.username,
                display_name: newUser.display_name || "",
                first_name: newUser.first_name || "",
                last_name: newUser.last_name || "",
                is_active: newUser.is_active,
                password: "", // Password is never pre-filled
                roleIds: newUser.roles?.map((role) => role.id).join(", ") || "",
            };
        } else {
            formData.value = { ...initialFormData };
        }
    },
    { immediate: true },
);

function mapFormErrors(issues: ZodIssue[]): FormValidation<UpdateUserFormData> {
    const errors: FormValidation<UpdateUserFormData> = {};
    for (const issue of issues) {
        if (issue.path.length > 0) {
            errors[issue.path[0] as keyof UpdateUserFormData] = issue.message;
        }
    }
    return errors;
}

async function validateField(field: keyof UpdateUserFormData) {
    const result = await updateUserFormSchema.safeParseAsync(formData.value);
    if (!result.success) {
        const fieldError = result.error.issues.find(
            (issue) => issue.path[0] === field,
        );
        if (fieldError) {
            validation.value[field] = fieldError.message;
        } else {
            delete validation.value[field];
        }
    } else {
        delete validation.value[field];
    }
}

const formIsValid: ComputedRef<boolean> = computed(() => {
    const result = updateUserFormSchema.safeParse(formData.value);
    return result.success;
});

function mapFormDataForApi(data: UpdateUserFormData): UpdateUserFormData {
    const cleanedData: UpdateUserFormData = { ...data };
    // Remove empty strings for optional fields to avoid sending them to the API
    for (const key in cleanedData) {
        if (Object.prototype.hasOwnProperty.call(cleanedData, key)) {
            const value = cleanedData[key as keyof UpdateUserFormData];
            if (typeof value === "string" && value === "") {
                cleanedData[key as keyof UpdateUserFormData] = undefined;
            }
        }
    }
    return cleanedData;
}

async function submitForm() {
    validation.value = {}; // Clear previous errors
    const result = await updateUserFormSchema.safeParseAsync(formData.value);

    if (!result.success) {
        validation.value = mapFormErrors(result.error.issues);
        logger.warn("Form validation failed:", validation.value);
        return;
    }

    logger.info("Form submitted with data:", result.data);
    emit("submit", mapFormDataForApi(result.data));
}

function cancelForm() {
    emit("cancel");
}
</script>

<style lang="css">
@layer components {
    .form__submit {
        border-color: var(--color-text-invert);
        color: var(--color-text-invert);
    }

    .input:not(:first-child) {
        margin-top: var(--spacing-md);
    }
}
</style>
