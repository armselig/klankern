import pkg from "../package.json";

export const APP = Object.freeze({
    name: pkg.name,
    version: pkg.version,
    desc: pkg.description,
});
