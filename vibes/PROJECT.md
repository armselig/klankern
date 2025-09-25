# Unsorted unknown project outline

- use latest pnpm
- use latest node lts
- use corepack
- avoid dependencies.
  - example: do not use complex state management library, if simple state management can be easily implemented in the project.
  - example 2: when asked for a javscript linter and a formatting tool, choose biome over eslint and prettier to save on the extra dependency
  - example 3: instead of installing lodash for some utilities like debounce or throttle, implement those yourself
- choose modern, but reliable toolings
- prefer fast (e.g. rust based) toolings over js/ts implementations
- use extensive JSDoc comments for slower javascript and TSDoc for typescript
  - example: choose lefthook over husky for git hooks
  - but don't forget: maybe it is easier to develop your own simple git hooks implementation
- use typescript
- use a linter for every language in the project, e.g. html, css, ts, markdown
- keep files relevant for ai agents in ./vibes/ directory
- proactively and autonomously keep a time-stamped diary file of our interactions in ./vibes/diary.md. add new entries as you go.
- git: use conventional commit messages
- i need a system to automatically maintain a ./CHANGELOG.md that updates with each version change (major, minor, patch)
- in architecture, strive for simplicity, maintainability and readability
- i need a project idea that implements a simple frontend and backend setup including a postgresql database
- postgres should run in a container with persistent storage
- for containers/containerization always use podman
- make suggestions how the frontend and backend should communicate
- this file may only be edited by me, a human

## project idea

- a web application for families to manage common family tasks together and collaborate
- shared to-do-lists, e.g. for shopping lists, chores. tasks can be assigned to family members
- shared calendar for appointments, events. entries can belong to a single or multiple family members, e.g. mom and child1 go to the swimming course on monday, on friday dad and child2 need to go to the doctor
- a board to post short notes or upload a photo like you would do with post-its on the refrigerator, e.g. "dinner is in the fridge!"
- should be a progressive web app with offline support
- ai agent should suggest additional features
- authentication and authorization. there should be an admin user who can access and control everything. parents should have more rights than the children. access should be configurable.
- no new user registration. admin will have to add users manually to maintain family privacy/security
- strong security measurements
