import { defineStore } from "pinia";

export const useCounterStore = defineStore("counter", () => {
    const count = ref(0);
    const name = ref("Eduardo");

    function increment() {
        count.value++;
    }

    return { count, name, increment };
});
