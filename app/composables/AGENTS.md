# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-06
**Commit:** 363356d
**Branch:** main

## OVERVIEW

Reusable composables for the Klankern frontend application.

## STRUCTURE

```
./app/composables/
├── useAuth.ts        # Authentication handling
├── useLogger.ts      # Logger utility
├── useAdmin.ts       # Admin panel utilities
└── use-nested-routes.ts # Route handling for nested components
```

## WHERE TO LOOK

| Task           | Location                               | Notes                                                  |
| -------------- | -------------------------------------- | ------------------------------------------------------ |
| Authentication | `app/composables/useAuth.ts`           | Handles login and logout flows with session management |
| Logging        | `app/composables/useLogger.ts`         | Centralized logging utility for client-side messages   |
| Admin Panel    | `app/composables/useAdmin.ts`          | Utilities for admin-specific functionality             |
| Routing        | `app/composables/use-nested-routes.ts` | Helper for nested route management                     |

## CONVENTIONS

- **Naming**: Composable functions start with `use` prefix
- **Reusability**: All composables are designed to be reusable across components
- **Type Safety**: Full TypeScript support with proper typing
- **Side Effects**: Minimize side effects; composables should be pure functions when possible
- **State Management**: Use Pinia for complex state management, composables for simple logic

## ANTI-PATTERNS (THIS PROJECT)

- **Never** access DOM directly in composables - use Vue's reactivity system
- **Never** mix business logic with UI rendering in composables
- **Never** make direct API calls in composables - use stores or dedicated API layer
- **Never** import server-side modules in composables

## UNIQUE STYLES

- **Consistent Interface**: All composables follow the same naming and pattern conventions
- **Documentation**: Full JSDoc comments explaining usage and purpose
- **Error Handling**: Proper error handling and propagation within composables
- **Testing**: Each composable is unit tested for reliability
