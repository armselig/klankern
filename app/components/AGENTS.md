# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-06
**Commit:** 363356d
**Branch:** main

## OVERVIEW

Frontend components for the Klankern application.

## STRUCTURE

```
./app/components/
├── admin/            # Admin panel components
├── families/         # Family-related components
├── ui/               # Generic UI components
└── layout/           # Layout components
```

## WHERE TO LOOK

| Task              | Location                   | Notes                                    |
| ----------------- | -------------------------- | ---------------------------------------- |
| Admin Components  | `app/components/admin/`    | Components for admin user management     |
| Family Components | `app/components/families/` | Family group and member management       |
| UI Components     | `app/components/ui/`       | Reusable UI elements like buttons, forms |
| Layout Components | `app/components/layout/`   | Page layouts and navigation              |

## CONVENTIONS

- **Naming**: Kebab-case for component names (`<my-component />`)
- **Structure**: Each component is in its own directory with component files
- **Props**: All props are clearly typed using TypeScript
- **Slots**: Use named slots when appropriate for flexible composition
- **Composition**: Use composables for shared logic rather than inline code
- **Template**: Start with semantic HTML and add JS functionality progressively

## ANTI-PATTERNS (THIS PROJECT)

- **Never** put business logic directly in components - use composables
- **Never** import server-side modules in frontend components
- **Never** use inline styles - use CSS modules or scoped styles
- **Never** mix rendering logic with data fetching - use stores/composables

## UNIQUE STYLES

- **Progressive Enhancement**: HTML-first approach, adding JavaScript functionality
- **WCAG Compliance**: Components are designed with accessibility in mind
- **Component Reusability**: Each component is designed to be reusable with flexible props
- **Type Safety**: All components use strict TypeScript typing
