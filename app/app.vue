<script setup lang="ts">
import { useCounterStore } from "~/stores/counter";

const counter = useCounterStore();
</script>

<template>
    <div>
        <NuxtRouteAnnouncer />
        <NuxtPage />
        <div>
            Counter: {{ counter.count }}
            <button @click="counter.increment()">+</button>
        </div>
    </div>
</template>
