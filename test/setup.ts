import { beforeAll, afterAll } from "vitest";

// Mock localStorage for the test environment
// This prevents errors from Vue DevTools Kit trying to access localStorage
// We need to check both if localStorage is undefined AND if it's incomplete
if (
    typeof localStorage === "undefined" ||
    typeof localStorage.getItem !== "function"
) {
    const storage = new Map<string, string>();

    const localStorageMock = {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
            storage.set(key, value);
        },
        removeItem: (key: string) => {
            storage.delete(key);
        },
        clear: () => {
            storage.clear();
        },
        get length() {
            return storage.size;
        },
        key: (index: number) => {
            const keys = Array.from(storage.keys());
            return keys[index] ?? null;
        },
    } as Storage;

    // Use Object.defineProperty to ensure it's properly set on global
    Object.defineProperty(global, "localStorage", {
        value: localStorageMock,
        writable: true,
        configurable: true,
    });
}

beforeAll(() => {
    // Runs once before all tests
    // Setup code can go here
});

afterAll(() => {
    // Runs once after all tests
    // Cleanup code can go here
});
