<template>
    <div>
        <h1>Admin dashboard</h1>
        <nav>
            <ul>
                <li><nuxt-link to="roles/">Roles management</nuxt-link></li>
            </ul>
        </nav>
    </div>
</template>

<script setup lang="ts">
import { definePageMeta } from "#imports";
definePageMeta({
    middleware: "admin",
});
</script>
