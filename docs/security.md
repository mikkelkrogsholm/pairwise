# Security Notes

Pairwise is intentionally small, but it still has security-sensitive flows:
bearer admin links, uploads, media serving, cookies, and public voting APIs.

## Trust Model

Pairwise has no account system. Admin access is controlled by possession of an
admin URL:

```text
/a/<token>
```

The token is a bearer secret. Anyone with it can administer that survey.

## Implemented Protections

### Admin Tokens

- Raw admin tokens are generated with browser/runtime cryptographic randomness.
- SQLite stores token hashes, not raw tokens.
- Admin links can be created per collaborator.
- Admin links can be revoked independently.
- The current admin link can be rotated.
- Admin mutations require a CSRF token tied to the admin link.

### CSRF

Admin POST routes require the admin CSRF token in the form body.

Public vote APIs are tied to one-time appearance tokens and survey-specific
voter cookies. They do not mutate admin state.

### Voter Cookies

`pwid_<slug>` cookies are:

- signed with an app secret,
- HTTP-only,
- `SameSite=Lax`,
- scoped to `/api/s/<slug>`,
- survey-specific.

This avoids reusing one voter id across surveys and prevents old survey cookies
from being sent to unrelated pages or static assets.

### Media Access

Uploaded files are stored on disk under `MEDIA_PATH`, but public access is not a
direct static directory listing.

Public media route:

- looks up the media path in SQLite,
- only serves active ideas,
- returns 404 for pending, hidden, missing, or invalid media paths.

Admin media preview route:

- requires a valid admin token,
- checks that the media belongs to the admin's survey.

### Upload Limits

Server-side validation checks media type and size. Participant media submissions
use stricter limits than admin uploads and are capped per survey. Invalid image
uploads are dropped and do not leave ideas behind.

### Host Header Handling

Generated share/admin links are relative by default. Operators can set
`PUBLIC_ORIGIN` to generate canonical absolute links. Pairwise does not trust the
incoming `Host` header for admin-link generation.

### YouTube

Server-rendered pages do not load YouTube thumbnails. The voting UI uses a
click-to-load button and embeds via `youtube-nocookie.com`.

## Operational Recommendations

- Serve Pairwise only over HTTPS in production.
- Set `PUBLIC_ORIGIN` to the canonical public URL.
- Put the app behind a reverse proxy that rejects unknown hosts.
- Keep `DATABASE_PATH` and `MEDIA_PATH` on persistent storage.
- Back up both SQLite and media together.
- Restrict filesystem access to the data volume.
- Do not publish admin links in issue trackers, chat logs, screenshots, or docs.
- Use separate admin links per collaborator.
- Rotate links after accidental exposure.

## Known Limits

Pairwise does not currently include:

- password login,
- MFA,
- central organisation/team accounts,
- audit log UI,
- per-IP persistent rate limits across process restarts,
- virus scanning for uploads,
- object storage signed URLs,
- end-user deletion self-service,
- a full content moderation system.

For public internet deployments with large or untrusted audiences, consider
adding a reverse-proxy rate limit, request body limits, malware scanning, and
operator alerting.

## Security Review Checklist

Before production use:

- Confirm HTTPS.
- Confirm `PUBLIC_ORIGIN`.
- Confirm reverse proxy host allowlist.
- Confirm Docker volume or filesystem permissions.
- Confirm backups include SQLite and media.
- Confirm backup retention/deletion policy.
- Create separate admin links for collaborators.
- Test rotate and revoke.
- Test delete survey on a staging instance.
- Review whether public participant uploads should be enabled.

