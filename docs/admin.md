# Admin Guide

Pairwise has no user accounts. Administration is based on secret bearer links:

- A vote link: `/s/<slug>`
- A results link: `/s/<slug>/results`
- One or more admin links: `/a/<token>`

Anyone with a valid admin link can administer that survey. Treat admin links like
passwords.

## First Admin

The first admin link is created when a survey is created. The confirmation page
shows the raw admin link once. Save it immediately.

The raw token is not stored in plaintext in SQLite. The database stores a
SHA-256 token hash, while the raw link is only available in the response that
creates or rotates it, or in the active request where the admin already supplied
the token.

## Multiple Admins

Open the admin page and use **Admin access** to create a named admin link for
each collaborator.

Recommended practice:

- Use one admin link per person.
- Give each link a human label, such as `Sofie` or `External reviewer`.
- Revoke a collaborator's own link when access is no longer needed.
- Do not share the primary admin link in group chats or docs.

## Revoking Admins

Revoking an admin link immediately prevents that token from loading the admin
page. Revocation does not affect the survey, votes, results, or other active
admin links.

Pairwise prevents removing the currently used admin link through the revoke
button, and it keeps at least one active admin link.

## Rotating the Current Admin Link

Use **Rotate this link** if the current admin link may have leaked.

Rotation:

- creates a new raw token,
- replaces the token hash and CSRF token for the current admin record,
- makes the old raw link stop working,
- redirects the browser to the new admin URL.

Copy the new link immediately after rotation.

## Survey Lifecycle

Admin can set the survey status:

| Status | Vote page | API voting | Participant suggestions | Results | Admin |
| --- | --- | --- | --- | --- | --- |
| Open | visible | allowed | allowed if enabled | visible | available |
| Closed | visible with closed message | blocked | blocked | visible | available |
| Archived | hidden with 404 | blocked | blocked | visible | available |

Use **Closed** when a survey is finished but participants may still have the
link. Use **Archived** when the voting page should disappear while the results
remain available.

## Deleting a Survey

Deleting a survey removes:

- survey settings,
- ideas,
- votes and pair appearances,
- admin links,
- local uploaded media files associated with the survey.

Deletion is permanent from the app's active database and media directory. If the
operator keeps filesystem, volume, or database backups, those backups need their
own retention and deletion policy.

## Moderation

Participant suggestions are either:

- pending, when auto-publish is off,
- active immediately, when auto-publish is on.

For public surveys, prefer moderation unless the participant group is trusted.
Media submissions have stricter public upload limits than admin uploads to
reduce storage abuse.

