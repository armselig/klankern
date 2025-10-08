<!--
This file is for AI agents. It provides instructions and guidelines for interacting with this project.
For more information, see https://agents.md/
-->

# Klankern Agent Guidelines

This document provides instructions for AI agents to work with the Klankern project. Please follow these guidelines to ensure smooth collaboration.

## Code Style Guidelines

- **NEVER** commit or push to Git without explicit approval.
- File names and custom elements/components use Kebab-case. DO: `utility-file.ts`, `<my-component />`. DON'T: `utility_file.ts`, `<MyComponent />`.
- Avoid [Nuxt Auto-Imports](https://nuxt.com/docs/4.x/guide/concepts/auto-imports)! Prefer consistent path aliasing (create as needed). Use `import xy from "#imports";` as a fallback to document dependency on auto-import in file. Try to refactor auto-imports if you encounter them.

## AI Agent Collaboration

- **Agent-Relevant Files**: Keep all files relevant for AI agents within the `./vibes/` directory.
- **Knowledge Graph**: If the MCP server `memory` is available, proactively and autonomously read the graph at the beginning of each session and keep it updated and maintained as you go.
- **NEVER** assume! **ALWAYS** ask clarifying questions.

## Known AI issues in the project

- Agents have no idea how to write proper Vitest tests in a Nuxt v4 environment. They screw up, get stuck in a loop and completely ignore documentation even if presented on a silver platter.
- Agents are completely lost with the current ESLint setup and how to fix linting errors, especially regarding imports and types.

## Further reading

- [`README.md`](./README.md)
- [Initial project plan](./vibes/PROJECT.md)
