<template>
    <form @submit.prevent="submitForm">
        <input-base input-id="id" input-name="id" :is-readonly="true">
            <template #label>User ID:</template>
            <template #description
                >This is set automatically by the app and only relevant for
                admins.</template
            >
        </input-base>
        <input-base
            input-id="username"
            input-name="username"
            input-pattern="[a-zA-Z0-9]{4,10}"
            input-placeholder="DadJoke1981"
            :is-required="true"
        >
            <template #label>Username:</template>
            <template #description
                ><p>
                    You will use your username to log into the app. It is not
                    visible to other users if you set a display name.
                </p>
                <p><strong>Requirements:</strong></p>
                <ul>
                    <li>Length between 4 and 10 characters</li>
                    <li>Alphanumeric characters only</li>
                </ul></template
            >
        </input-base>
        <input-base
            input-id="displayname"
            input-name="displayname"
            input-placeholder="Holger Holgersson III."
        >
            <template #label>Display name:</template>
            <template #description
                >Your display name will be shown on a all posts and entries you
                make in this app. If you leave this empty, your username will be
                used instead.</template
            >
        </input-base>
        <input-base
            input-id="email"
            input-mode="email"
            input-name="email"
            input-type="email"
            input-placeholder="dad@holgersson.family"
            :is-required="true"
        >
            <template #label>Email:</template>
        </input-base>
        <button-base class="form__submit" type="submit">Submit</button-base>
    </form>
</template>

<script setup lang="ts">
import { useLogger } from "#composables/useLogger";

const logger = useLogger();

function submitForm(event: Event) {
    logger.info("submitForm", event);
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
