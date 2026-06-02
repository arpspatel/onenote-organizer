# Security Specification: Notes Organizer

This document defines the data invariants, penetration testing payloads, and rules validation for securing the Notes Organizer application in Firestore.

## 1. Data Invariants

- **Ownership Isolation**: Notebooks, Sections, and Pages must belong to a specific authenticated user (`userId`).
- **Relational Integrity**: 
  - A Section cannot exist without a valid parent Notebook ID (`notebookId`).
  - A Page cannot exist without a valid parent Notebook ID (`notebookId`) and Section ID (`sectionId`).
- **Field Immutability**: The `userId` and `id` fields of Notebooks, Sections, and Pages cannot be modified after creation.
- **Timestamp Integrity**: `createdAt` must match the server timestamp (`request.time`) on creation. `updatedAt` must match the server timestamp on update.
- **Input Validation**: All string identifiers, names, and content sizes are restricted with maximum values to avoid storage starvation attacks.

---

## 2. The "Dirty Dozen" Payloads (Red Team Exploitation Vectors)

These payloads are designed to challenge our Firestore rules. Each of these must be blocked and return `PERMISSION_DENIED`:

### Notebooks Collection Exploits
1. **Unauthenticated Write**: Creating a notebook without being signed in.
2. **Identity Spoofing**: Creating a notebook with a `userId` field pointing to another user.
3. **Ghost Fields Injection**: Adding an unrequested field (e.g., `verifiedAdmin: true`) to bypass schema limits.
4. **Name Poisoning**: Creating a notebook with a massive name string (>10,000 characters) to bloat database records.

### Sections Collection Exploits
5. **Orphaned Section**: Creating a section with a non-existent parent `notebookId`.
6. **Cross-User Parent Association**: Linking a section to a sibling notebook owned by a different user.
7. **Privilege Escalation**: Attempting to transfer ownership of a section to another user during an update.
8. **Malicious ID injection**: Attempting to create a section with a highly nested, junk-character document ID.

### Pages Collection Exploits
9. **Zero-Verify Author**: Creating a page without standard email verification flags (`request.auth.token.email_verified == false`).
10. **Section Shortcutting**: Moving a page to a section that belongs to a sibling notebook of a different user.
11. **Timestamp Forgery**: Forcing a custom, client-generated past or future timestamp in the `createdAt` or `updatedAt` fields.
12. **Blanket Query Scraping**: Requesting lists of pages without applying the correct `where("userId", "==", auth.uid)` filter.

---

## 3. Core Firewalls (Firestore Security Rules Plan)

Our final firestore rules will enforce:
- Verification of emails before document modification (`request.auth.token.email_verified == true`).
- Standard ID and size sanitizers for any inputs.
- Schema conformity using logic helpers strictly validating incoming models.
- Relation lock checks: fetching parent notebook and section using `get()` references to guarantee matching user ownership.
