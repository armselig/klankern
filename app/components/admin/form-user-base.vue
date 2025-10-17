<template>
    <fieldset>
        <legend>User Details</legend>
        <div>
            <label for="username">Username</label>
            <input
                id="username"
                :value="props.user.username"
                type="text"
                required
                @input="
                    $emit('update:user', {
                        ...props.user,
                        username: ($event.target as HTMLInputElement).value,
                    })
                "
            />
        </div>
        <div>
            <label for="email">Email</label>
            <input
                id="email"
                :value="props.user.email"
                type="email"
                required
                @input="
                    $emit('update:user', {
                        ...props.user,
                        email: ($event.target as HTMLInputElement).value,
                    })
                "
            />
        </div>
        <!-- Password field will be handled by create/update specific forms -->
        <div>
            <label for="display_name">Display Name</label>
            <input
                id="display_name"
                :value="props.user.display_name"
                type="text"
                @input="
                    $emit('update:user', {
                        ...props.user,
                        display_name: ($event.target as HTMLInputElement).value,
                    })
                "
            />
        </div>
        <div>
            <label for="first_name">First Name</label>
            <input
                id="first_name"
                :value="props.user.first_name"
                type="text"
                @input="
                    $emit('update:user', {
                        ...props.user,
                        first_name: ($event.target as HTMLInputElement).value,
                    })
                "
            />
        </div>
        <div>
            <label for="last_name">Last Name</label>
            <input
                id="last_name"
                :value="props.user.last_name"
                type="text"
                @input="
                    $emit('update:user', {
                        ...props.user,
                        last_name: ($event.target as HTMLInputElement).value,
                    })
                "
            />
        </div>
    </fieldset>

    <fieldset>
        <legend>Roles</legend>
        <div v-for="role in availableRoles.roles" :key="role.id">
            <input
                :id="`role-${role.id}`"
                :checked="props.user.roleIds.includes(role.id)"
                type="checkbox"
                :value="role.id"
                @change="
                    handleRoleChange(
                        role.id,
                        ($event.target as HTMLInputElement).checked,
                    )
                "
            />
            <label :for="`role-${role.id}`">{{ role.name }}</label>
        </div>
    </fieldset>
</template>

<script setup lang="ts">
/**
 * @file Base form component for user details.
 * @description This component provides the common input fields for user information and role selection.
 * It is designed to be used by `form-user-create.vue` and `form-user-update.vue`.
 */

import type { CreateUserFormData } from "#imports";

const props = defineProps<{
    user: CreateUserFormData;
}>();

const emit = defineEmits(["update:user"]);

const availableRoles = reactive({
    roles: [
        { id: "1", name: "Admin" },
        { id: "2", name: "User" },
    ],
});

function handleRoleChange(roleId: string, isChecked: boolean) {
    const newRoleIds = isChecked
        ? [...props.user.roleIds, roleId]
        : props.user.roleIds.filter((id) => id !== roleId);
    emit("update:user", { ...props.user, roleIds: newRoleIds });
}
</script>
