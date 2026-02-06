# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-06
**Commit:** 363356d
**Branch:** main

## OVERVIEW

Shared types and utilities used across the Klankern application.

## STRUCTURE

```
./shared/
├── types/            # Shared TypeScript types
└── utils/            # Shared utility functions
```

## WHERE TO LOOK

| Task         | Location                 | Notes                                   |
| ------------ | ------------------------ | --------------------------------------- |
| API Types    | `shared/types/api.ts`    | Types for API responses and requests    |
| Auth Types   | `shared/types/auth.ts`   | Types for authentication data           |
| Common Types | `shared/types/common.ts` | Basic shared types like ID or timestamp |

## CONVENTIONS

- **Type Safety**: All shared types use TypeScript with strict checking
- **Immutability**: Types are read-only when possible
- **Reusability**: Types are shared to reduce redundancy and ensure consistency
- **Namespacing**: All exported types are prefixed to avoid conflicts

## ANTI-PATTERNS (THIS PROJECT)

- **Never** define the same type twice in different files
- **Never** mix TypeScript and JavaScript in shared utilities
- **Never** export default in shared type files

## UNIQUE STYLES

- **Consistent Typing**: All shared types follow consistent naming and structure conventions
- **Documentation**: All types include clear TSDoc comments explaining their purpose
- **Exports**: Named exports only for shared types to enable tree-shaking
