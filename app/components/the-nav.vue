<script setup lang="ts">
import { useNestedRoutes } from "#composables/use-nested-routes";

const { nestedRoutes } = useNestedRoutes();
</script>

<template>
    <nav>
        <ol>
            <nav-item
                v-for="route in nestedRoutes"
                :key="route.path"
                :route="route"
            />
        </ol>
    </nav>
</template>
