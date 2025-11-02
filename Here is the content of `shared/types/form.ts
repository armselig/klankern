export interface FormValidation<T extends Record<string, any>> {
    [K in keyof T]?: string;
}
