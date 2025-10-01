## Family Feature Architecture

The architecture for the family feature will involve the following key components:

**1. Data Model (Drizzle ORM & PostgreSQL):**

- **`users`**: Existing table for user authentication.
- **`families`**: New table to store family details (ID, name, creator ID, timestamps).
- **`familyMembers`**: New junction table linking users to families, including a `role` field (e.g., 'manager', 'member') to define permissions within the family. (Note: While initially simple, a hierarchical role system with predefined permissions is envisioned for future expansion).
- **`familyInvitations`**: New table to manage invitations (ID, family ID, invited email, invitation token, status, expiry, timestamps).
- **Shared Asset Tables (`calendars`, `toDoLists`, `corkboards`)**: Existing tables will be modified to include a `familyId` foreign key, linking them to specific families.

**2. Backend (Nuxt.js Server/Nitro):**

- **API Endpoints**:
    - **Family Management**: `POST /api/families` (create), `GET /api/families` (list user's families), `GET /api/families/:id` (get family details), `PUT /api/families/:id` (update), `DELETE /api/families/:id` (soft delete/archive family; a multi-step disbandment process will be implemented for permanent deletion).
    - **Member Management**: `GET /api/families/:familyId/members` (list members), `DELETE /api/families/:familyId/members/:userId` (remove member).
    - **Invitation Management**: `POST /api/families/:familyId/invitations` (send invitation), `GET /api/invitations` (list user's invitations), `POST /api/invitations/:invitationToken/accept` (accept), `POST /api/invitations/:invitationToken/decline` (decline), `DELETE /api/families/:familyId/invitations/:invitationId` (revoke).
    - **Shared Asset Access**: Existing asset APIs will be adapted or new ones created to handle `familyId` for creation, retrieval, update, and deletion.
- **Authorization Logic**: Server-side middleware will enforce that only family managers can perform administrative actions (invite, remove, update/delete family) and that only family members can access shared assets.
- **Email Service Integration**: To send invitation emails.
- **Logging**: Winston will be used to log all significant events and actions related to families and invitations. (Recommendation: Integrate a Centralized Error Tracking Service like Sentry or Bugsnag for production environments).

**3. Frontend (Nuxt.js/Vue.js):**

- **Pages**: Dedicated pages for family listing, creation, individual family dashboards, and invitation management.
- **Components**: Reusable UI components for family cards, forms, member lists, invitation displays, and integrated shared asset views.
- **State Management (Pinia)**: `useFamilyStore` and `useInvitationStore` will manage client-side data and interactions.
- **UI/UX**: Clear user flows for creating families, inviting members, accepting/declining invitations, and managing family settings. UI elements will dynamically adjust based on user roles (e.g., showing "Invite" button only to managers).

**4. Security & Authorization:**

- **Authentication**: Leverages existing `nuxt-auth-utils`.
- **Server-Side Enforcement**: All API calls will be strictly authorized based on user roles and family membership.
- **Secure Invitation Tokens**: Unique, time-limited tokens for invitation acceptance.
- **Input Validation**: Zod will be used for robust validation of all incoming data.

**5. Integration with Existing Features:**

- The `familyId` foreign key will link shared calendars, to-do lists, and corkboards to specific families.
- Existing asset APIs and frontend components will be adapted to support this new `familyId` context, allowing users to create and view assets within a family.

This architecture provides a robust and scalable foundation for the family feature, ensuring secure and collaborative functionality.
