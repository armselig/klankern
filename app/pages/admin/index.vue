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
definePageMeta({
    middleware: "admin",
});
</script>
