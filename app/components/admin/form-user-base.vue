<template>
    <fieldset>
        <legend>User Details</legend>
        <div>
            <label for="username">Username</label>
            <input
                id="username"
                :value="props.username"
                type="text"
                required
                @input="
                    $emit(
                        'update:username',
                        ($event.target as HTMLInputElement).value,
                    )
                "
            />
        </div>
        <div>
            <label for="email">Email</label>
            <input
                id="email"
                :value="props.email"
                type="email"
                required
                @input="
                    $emit(
                        'update:email',
                        ($event.target as HTMLInputElement).value,
                    )
                "
            />
        </div>
        <!-- Password field will be handled by create/update specific forms -->
        <div>
            <label for="display_name">Display Name</label>
            <input
                id="display_name"
                :value="props.display_name"
                type="text"
                @input="
                    $emit(
                        'update:display_name',
                        ($event.target as HTMLInputElement).value,
                    )
                "
            />
        </div>
        <div>
            <label for="first_name">First Name</label>
            <input
                id="first_name"
                :value="props.first_name"
                type="text"
                @input="
                    $emit(
                        'update:first_name',
                        ($event.target as HTMLInputElement).value,
                    )
                "
            />
        </div>
        <div>
            <label for="last_name">Last Name</label>
            <input
                id="last_name"
                :value="props.last_name"
                type="text"
                @input="
                    $emit(
                        'update:last_name',
                        ($event.target as HTMLInputElement).value,
                    )
                "
            />
        </div>
    </fieldset>

    <fieldset>
        <legend>Roles</legend>
        <div v-for="role in availableRoles.roles" :key="role.id">
            <input
                :id="`role-${role.id}`"
                :checked="props.roleIds.includes(role.id)"
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
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAdminUserStore } from "~/stores/admin/users";

/**
 * @file Base form component for user details.
 * @description This component provides the common input fields for user information and role selection.
 * It is designed to be used by `form-user-create.vue` and `form-user-update.vue`.
 */

const props = defineProps<{
    username: string;
    email: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
    roleIds: string[];
}>();

const emit = defineEmits([
    "update:username",
    "update:email",
    "update:display_name",
    "update:first_name",
    "update:last_name",
    "update:roleIds",
]);

const userStore = useAdminUserStore();
const { roles: availableRoles } = storeToRefs(userStore);

function handleRoleChange(roleId: string, isChecked: boolean) {
    const newRoleIds = isChecked
        ? [...props.roleIds, roleId]
        : props.roleIds.filter((id) => id !== roleId);
    emit("update:roleIds", newRoleIds);
}

onMounted(async () => {
    // Fetch available roles if they haven't been fetched already.
    if (availableRoles.value.length === 0) {
        await userStore.fetchRoles();
    }
});
</script>
