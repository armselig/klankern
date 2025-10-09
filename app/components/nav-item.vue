<script setup lang="ts">
import type { RouteRecordRaw } from "vue-router";

interface Props {
    route: RouteRecordRaw;
}

const props = defineProps<Props>();

const formatRouteName = (name: string | symbol | undefined): string => {
    if (typeof name === "string") {
        return name
            .replace(/-/g, " ") // Replace hyphens with spaces
            .split("/")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
            .join(" ")
            .trim();
    }
    return "Unnamed Route";
};
</script>

<template>
    <li>
        <nuxt-link :to="props.route.path">{{
            formatRouteName(props.route.name)
        }}</nuxt-link>
        <ol v-if="props.route.children && props.route.children.length > 0">
            <nav-item
                v-for="childRoute in props.route.children"
                :key="childRoute.path"
                :route="childRoute"
            />
        </ol>
    </li>
</template>
