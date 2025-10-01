**As a registered user,**
**I want to create and manage a family group,**
**so that my family can easily organize and collaborate using shared calendars, to-do lists, and corkboards.**

**Acceptance Criteria:**

- **Family Group Creation:**
    - Given I am a registered user, when I create a family group, then I become its sole manager/admin.
    - Given I am a registered user, when I create a family group, then a dedicated set of shared calendars, to-do lists, and corkboards is provisioned for that group.
- **Member Invitation:**
    - Given I am the family manager, when I invite another registered user by their email address, then an invitation is sent to that user.
    - Given I am an invited user, when I receive a family group invitation, then I can accept or decline it.
    - Given I am an invited user, when I accept a family group invitation, then I automatically gain access to all shared assets of that family group.
    - Given I am an invited user, when I decline a family group invitation, then I do not gain access to the family group's assets.
- **Member Management:**
    - Given I am the family manager, when I invite a user, then that user is added to the list of pending invitations until they accept or decline.
    - Given I am the family manager, when a user accepts an invitation, then they become a member of the family group.
    - Given I am the family manager, when I remove a member from the family group, then that member loses access to all shared assets.
    - Given I am a family member (not the manager), then I cannot invite or remove other users from the family group.
- **Managerial Authority:**
    - Given I am the family manager, then I am the only one who can invite or remove members from the family group.
