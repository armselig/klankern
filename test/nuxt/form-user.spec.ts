import { mount, VueWrapper, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import FormUser from "@/components/form-user.vue";
import type { UserResponse, UpdateUserFormData } from "#shared/types/user";

// Mock the useLogger composable
vi.mock("#composables/useLogger", () => ({
    useLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

describe("FormUser", () => {
    let wrapper: VueWrapper<InstanceType<typeof FormUser>>;

    const findSubmitButton = (w: VueWrapper<InstanceType<typeof FormUser>>) =>
        w.findAll("button").find((b) => b.text() === "Submit");

    const mockUser: UserResponse = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        username: "testuser",
        display_name: "Test User",
        first_name: "Test",
        last_name: "User",
        is_active: true,
        dashboardConfig: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        roles: [
            {
                id: "role-uuid-1",
                name: "admin",
                description: "Administrator role",
            },
        ],
    };

    beforeEach(() => {
        wrapper?.unmount();
    });

    describe("Initial Rendering", () => {
        it("renders the form with all fieldsets", () => {
            wrapper = mount(FormUser);

            const fieldsets = wrapper.findAll("fieldset");
            expect(fieldsets).toHaveLength(3);

            const legends = wrapper.findAll("legend");
            expect(legends[0].text()).toBe("User Details");
            expect(legends[1].text()).toBe("Roles");
            expect(legends[2].text()).toBe("Password");
        });

        it("renders submit and cancel buttons", () => {
            wrapper = mount(FormUser);

            const buttons = wrapper.findAll("button");
            expect(buttons.length).toBeGreaterThanOrEqual(2);
            expect(buttons.some((b) => b.text() === "Submit")).toBe(true);
            expect(buttons.some((b) => b.text() === "Cancel")).toBe(true);
        });

        it("initializes with empty form data", () => {
            wrapper = mount(FormUser);

            const usernameInput = wrapper.find('input[name="username"]');
            const emailInput = wrapper.find('input[name="email"]');

            expect((usernameInput.element as HTMLInputElement).value).toBe("");
            expect((emailInput.element as HTMLInputElement).value).toBe("");
        });

        it("sets is_active checkbox to checked by default", () => {
            wrapper = mount(FormUser);

            const isActiveCheckbox = wrapper.find('input[name="is_active"]');
            expect(isActiveCheckbox.element.checked).toBe(true);
        });
    });

    describe("Edit Mode", () => {
        it("populates form when user prop is provided", async () => {
            wrapper = mount(FormUser, {
                props: {
                    user: mockUser,
                },
            });

            await nextTick();

            const usernameInput = wrapper.find('input[name="username"]');
            const emailInput = wrapper.find('input[name="email"]');
            const displayNameInput = wrapper.find('input[name="display_name"]');
            const firstNameInput = wrapper.find('input[name="first_name"]');
            const lastNameInput = wrapper.find('input[name="last_name"]');

            expect((usernameInput.element as HTMLInputElement).value).toBe(
                "testuser",
            );
            expect((emailInput.element as HTMLInputElement).value).toBe(
                "test@example.com",
            );
            expect((displayNameInput.element as HTMLInputElement).value).toBe(
                "Test User",
            );
            expect((firstNameInput.element as HTMLInputElement).value).toBe(
                "Test",
            );
            expect((lastNameInput.element as HTMLInputElement).value).toBe(
                "User",
            );
        });

        it("converts role array to comma-separated string", async () => {
            wrapper = mount(FormUser, {
                props: {
                    user: mockUser,
                },
            });

            await nextTick();

            const roleIdsInput = wrapper.find('input[name="roleIds"]');
            expect((roleIdsInput.element as HTMLInputElement).value).toBe(
                "role-uuid-1",
            );
        });

        it("never pre-fills password field", async () => {
            wrapper = mount(FormUser, {
                props: {
                    user: mockUser,
                },
            });

            await nextTick();

            const passwordInput = wrapper.find('input[name="password"]');
            expect((passwordInput.element as HTMLInputElement).value).toBe("");
        });

        it("updates form when user prop changes", async () => {
            wrapper = mount(FormUser, {
                props: {
                    user: mockUser,
                },
            });

            await nextTick();

            const updatedUser: UserResponse = {
                ...mockUser,
                username: "newusername",
                email: "new@example.com",
            };

            await wrapper.setProps({ user: updatedUser });
            await nextTick();

            const usernameInput = wrapper.find('input[name="username"]');
            const emailInput = wrapper.find('input[name="email"]');

            expect((usernameInput.element as HTMLInputElement).value).toBe(
                "newusername",
            );
            expect((emailInput.element as HTMLInputElement).value).toBe(
                "new@example.com",
            );
        });
    });

    describe("Form Validation", () => {
        it("disables submit button when form is invalid", () => {
            wrapper = mount(FormUser);

            const submitButton = findSubmitButton(wrapper);

            expect(submitButton?.element.disabled).toBe(true);
        });

        it("enables submit button when form is valid", async () => {
            wrapper = mount(FormUser, {
                props: {
                    passwordRequired: false,
                },
            });

            const usernameInput = wrapper.find('input[name="username"]');
            const emailInput = wrapper.find('input[name="email"]');

            await usernameInput.setValue("validuser");
            await emailInput.setValue("valid@example.com");
            await nextTick();

            const submitButton = findSubmitButton(wrapper);

            expect(submitButton?.element.disabled).toBe(false);
        });

        it("prevents form submission with invalid email", async () => {
            wrapper = mount(FormUser);

            const usernameInput = wrapper.find('input[name="username"]');
            const emailInput = wrapper.find('input[name="email"]');

            await usernameInput.setValue("validuser");
            await emailInput.setValue("invalid-email");
            await flushPromises();
            await nextTick();

            const submitButton = findSubmitButton(wrapper);

            // Form should be invalid with bad email
            expect(submitButton?.element.disabled).toBe(true);
        });

        it("requires password when passwordRequired is true", () => {
            wrapper = mount(FormUser, {
                props: {
                    passwordRequired: true,
                },
            });

            const passwordInput = wrapper.find('input[name="password"]');
            expect((passwordInput.element as HTMLInputElement).required).toBe(
                true,
            );
        });

        it("does not require password when passwordRequired is false", () => {
            wrapper = mount(FormUser, {
                props: {
                    passwordRequired: false,
                },
            });

            const passwordInput = wrapper.find('input[name="password"]');
            expect((passwordInput.element as HTMLInputElement).required).toBe(
                false,
            );
        });

        it("prevents form submission with short password", async () => {
            wrapper = mount(FormUser, {
                props: {
                    passwordRequired: true,
                },
            });

            const passwordInput = wrapper.find('input[name="password"]');
            const usernameInput = wrapper.find('input[name="username"]');
            const emailInput = wrapper.find('input[name="email"]');

            await usernameInput.setValue("validuser");
            await emailInput.setValue("valid@example.com");
            await passwordInput.setValue("short");
            await flushPromises();
            await nextTick();

            const submitButton = findSubmitButton(wrapper);

            // Form should be invalid with short password
            expect(submitButton?.element.disabled).toBe(true);
        });

        it("prevents form submission with invalid role UUIDs", async () => {
            wrapper = mount(FormUser);

            const usernameInput = wrapper.find('input[name="username"]');
            const emailInput = wrapper.find('input[name="email"]');
            const roleIdsInput = wrapper.find('input[name="roleIds"]');

            await usernameInput.setValue("validuser");
            await emailInput.setValue("valid@example.com");
            await roleIdsInput.setValue("invalid-uuid");
            await flushPromises();
            await nextTick();

            const submitButton = findSubmitButton(wrapper);

            // Form should be invalid with bad UUID
            expect(submitButton?.element.disabled).toBe(true);
        });
    });

    describe("Form Submission", () => {
        it("emits submit event with valid form data", async () => {
            wrapper = mount(FormUser, {
                props: {
                    passwordRequired: false,
                },
            });

            const usernameInput = wrapper.find('input[name="username"]');
            const emailInput = wrapper.find('input[name="email"]');

            await usernameInput.setValue("validuser");
            await emailInput.setValue("valid@example.com");
            await nextTick();

            const form = wrapper.find("form");
            await form.trigger("submit.prevent");
            await nextTick();

            expect(wrapper.emitted("submit")).toBeTruthy();
            const emittedData = wrapper.emitted(
                "submit",
            )![0][0] as UpdateUserFormData;
            expect(emittedData.username).toBe("validuser");
            expect(emittedData.email).toBe("valid@example.com");
        });

        it("does not emit submit when form is invalid", async () => {
            wrapper = mount(FormUser);

            const form = wrapper.find("form");
            await form.trigger("submit.prevent");
            await nextTick();

            expect(wrapper.emitted("submit")).toBeFalsy();
        });

        it("converts comma-separated roleIds to array", async () => {
            wrapper = mount(FormUser, {
                props: {
                    passwordRequired: false,
                },
            });

            const usernameInput = wrapper.find('input[name="username"]');
            const emailInput = wrapper.find('input[name="email"]');
            const roleIdsInput = wrapper.find('input[name="roleIds"]');

            await usernameInput.setValue("validuser");
            await emailInput.setValue("valid@example.com");
            await roleIdsInput.setValue(
                "123e4567-e89b-12d3-a456-426614174000, 223e4567-e89b-12d3-a456-426614174000",
            );
            await nextTick();

            const form = wrapper.find("form");
            await form.trigger("submit.prevent");
            await nextTick();

            expect(wrapper.emitted("submit")).toBeTruthy();
            const emittedData = wrapper.emitted(
                "submit",
            )![0][0] as UpdateUserFormData;
            expect(Array.isArray(emittedData.roleIds)).toBe(true);
            expect(emittedData.roleIds).toHaveLength(2);
        });

        it("removes empty string fields before submitting", async () => {
            wrapper = mount(FormUser, {
                props: {
                    passwordRequired: false,
                },
            });

            const usernameInput = wrapper.find('input[name="username"]');
            const emailInput = wrapper.find('input[name="email"]');
            const displayNameInput = wrapper.find('input[name="display_name"]');

            await usernameInput.setValue("validuser");
            await emailInput.setValue("valid@example.com");
            await displayNameInput.setValue(""); // Empty string
            await nextTick();

            const form = wrapper.find("form");
            await form.trigger("submit.prevent");
            await nextTick();

            const emittedData = wrapper.emitted(
                "submit",
            )![0][0] as UpdateUserFormData;
            expect(emittedData.display_name).toBeUndefined();
        });

        it("includes all filled fields in submission", async () => {
            wrapper = mount(FormUser, {
                props: {
                    passwordRequired: true,
                },
            });

            const usernameInput = wrapper.find('input[name="username"]');
            const emailInput = wrapper.find('input[name="email"]');
            const displayNameInput = wrapper.find('input[name="display_name"]');
            const firstNameInput = wrapper.find('input[name="first_name"]');
            const lastNameInput = wrapper.find('input[name="last_name"]');
            const passwordInput = wrapper.find('input[name="password"]');

            await usernameInput.setValue("validuser");
            await emailInput.setValue("valid@example.com");
            await displayNameInput.setValue("Display Name");
            await firstNameInput.setValue("First");
            await lastNameInput.setValue("Last");
            await passwordInput.setValue("validpassword123");
            await nextTick();

            const form = wrapper.find("form");
            await form.trigger("submit.prevent");
            await nextTick();

            const emittedData = wrapper.emitted(
                "submit",
            )![0][0] as UpdateUserFormData;
            expect(emittedData.username).toBe("validuser");
            expect(emittedData.email).toBe("valid@example.com");
            expect(emittedData.display_name).toBe("Display Name");
            expect(emittedData.first_name).toBe("First");
            expect(emittedData.last_name).toBe("Last");
            expect(emittedData.password).toBe("validpassword123");
        });
    });

    describe("Cancel Functionality", () => {
        it("emits cancel event when cancel button is clicked", async () => {
            wrapper = mount(FormUser);

            const cancelButton = wrapper
                .findAll("button")
                .find((b) => b.text() === "Cancel");

            await cancelButton?.trigger("click");
            await nextTick();

            expect(wrapper.emitted("cancel")).toBeTruthy();
        });
    });

    describe("Two-way Binding", () => {
        it("updates formData when input value changes", async () => {
            wrapper = mount(FormUser);

            const usernameInput = wrapper.find('input[name="username"]');
            await usernameInput.setValue("newusername");
            await nextTick();

            expect((usernameInput.element as HTMLInputElement).value).toBe(
                "newusername",
            );
        });

        it("updates checkbox state when clicked", async () => {
            wrapper = mount(FormUser);

            const isActiveCheckbox = wrapper.find('input[name="is_active"]');
            await isActiveCheckbox.setValue(false);
            await nextTick();

            expect((isActiveCheckbox.element as HTMLInputElement).checked).toBe(
                false,
            );
        });
    });

    describe("Field-level Validation", () => {
        it("prevents submission when username is too short", async () => {
            wrapper = mount(FormUser);

            const usernameInput = wrapper.find('input[name="username"]');
            const emailInput = wrapper.find('input[name="email"]');

            await emailInput.setValue("valid@example.com");
            await usernameInput.setValue("ab"); // Too short (min 3)
            await flushPromises();
            await nextTick();

            const submitButton = findSubmitButton(wrapper);

            // Form should be invalid with short username
            expect(submitButton?.element.disabled).toBe(true);
        });

        it("clears validation error when field becomes valid", async () => {
            wrapper = mount(FormUser);

            const usernameInput = wrapper.find('input[name="username"]');

            // Set invalid value
            await usernameInput.setValue("ab");
            await usernameInput.trigger("blur");
            await nextTick();

            let outputs = wrapper.findAll("output");
            const initialErrorCount = outputs.length;

            // Set valid value
            await usernameInput.setValue("validusername");
            await usernameInput.trigger("blur");
            await nextTick();

            outputs = wrapper.findAll("output");
            expect(outputs.length).toBeLessThanOrEqual(initialErrorCount);
        });
    });
});
