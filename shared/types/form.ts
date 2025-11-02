export type FormValidation<T extends Record<string, unknown>> = {
    [K in keyof T]?: string;
};
