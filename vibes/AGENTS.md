# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-06
**Commit:** 363356d
**Branch:** main

## OVERVIEW

Project documentation and decision logs for the Klankern application.

## STRUCTURE

```
./vibes/
├── *.md              # Documentation and decision logs
└── diary.md          # Project activity diary
```

## WHERE TO LOOK

| Task                  | Location           | Notes                                                   |
| --------------------- | ------------------ | ------------------------------------------------------- |
| Project Plans         | `vibes/PROJECT.md` | Initial project outline and plans                       |
| Implementation Guides | `vibes/*-guide.md` | Technical documentation for implementation              |
| Decision Logs         | `vibes/*-plan.md`  | Documentation of key decisions and implementation plans |
| Activity Diary        | `vibes/diary.md`   | Daily project activity log                              |

## CONVENTIONS

- **Documentation**: All AI agent-related documentation resides in this directory
- **Timestamps**: Files are prefixed with date stamps for chronological organization
- **Content**: Each document should have a clear purpose and be relevant to project development
- **Updates**: This directory is for project-relevant documentation only

## ANTI-PATTERNS (THIS PROJECT)

- **Never** put application code or configuration files in this directory
- **Never** store sensitive information here
- **Never** duplicate information that already exists elsewhere in the codebase

## UNIQUE STYLES

- **AI Agent Focus**: This directory specifically serves AI agents working on the project
- **Chronological**: Content is organized chronologically for easy tracking
- **Minimal Structure**: Simple and straightforward file organization
- **Project-Specific**: Everything here relates directly to this project's development
