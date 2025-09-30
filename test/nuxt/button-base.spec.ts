import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ButtonBase from "@/components/button-base.vue";

describe("ButtonBase", () => {
    it("renders the button with the default slot content", () => {
        const wrapper = mount(ButtonBase);
        expect(wrapper.text()).toBe("Button");
    });

    it("renders the button with the provided slot content", () => {
        const wrapper = mount(ButtonBase, {
            slots: {
                default: "Click me",
            },
        });
        expect(wrapper.text()).toBe("Click me");
    });

    it("disables the button when the disabled prop is true", () => {
        const wrapper = mount(ButtonBase, {
            props: {
                disabled: true,
            },
        });
        expect(wrapper.find("button").element.disabled).toBe(true);
    });

    it("emits a click event when the button is clicked", async () => {
        const wrapper = mount(ButtonBase);
        await wrapper.find("button").trigger("click");
        expect(wrapper.emitted().click).toBeTruthy();
    });
});
