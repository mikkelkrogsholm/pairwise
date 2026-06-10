# Deployment Guide

Pairwise is designed to run as one Bun process with one SQLite database and a
media directory.

## Docker Compose

```bash
docker compose up --build
```

The default compose setup persists app data in the `pairwise-data` volume.

## Plain Docker

```bash
docker build -t pairwise .
docker run \
  -p 3000:3000 \
  -v pairwise-data:/app/data \
  -e PUBLIC_ORIGIN=https://pairwise.example.com \
  pairwise
```

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port inside the container/process |
| `DATABASE_PATH` | `./data/pairwise.db` | SQLite database path |
| `MEDIA_PATH` | `<db dir>/media` | Directory for uploaded WebP/audio/WebM files |
| `PUBLIC_ORIGIN` | relative links | Canonical public origin for generated links |
| `TRUST_PROXY_HEADERS` | off | Use forwarded IP headers for rate-limit keys |
| `NODE_ENV` | unset | `production` enables secure cookies |

## Reverse Proxy

Recommended production proxy responsibilities:

- terminate TLS,
- forward only the canonical hostname,
- reject unknown `Host` headers,
- set request body limits,
- apply coarse IP rate limits,
- forward `X-Forwarded-For` only from trusted proxy layers.

If `TRUST_PROXY_HEADERS=1`, make sure untrusted clients cannot spoof
`X-Forwarded-For`, `X-Real-IP`, or `CF-Connecting-IP`.

## HTTPS and Cookies

When `NODE_ENV=production`, Pairwise sets cookies with the `Secure` attribute.
Use HTTPS in production, otherwise secure cookies will not be sent by browsers.

## Storage

SQLite and media must be backed up together:

- `DATABASE_PATH`
- `MEDIA_PATH`

Votes reference media through database records. If the database and media
directory are restored from different points in time, some media previews may be
missing or orphaned.

## Backups

Suggested baseline:

1. Stop writes briefly or use SQLite's backup tooling.
2. Back up the SQLite database.
3. Back up `MEDIA_PATH`.
4. Store both artifacts with the same timestamp.
5. Test restore on a staging instance.

Backups may contain personal data. Define retention periods and deletion
procedures.

## Upgrades

Pairwise runs lightweight SQLite migrations at startup. Before upgrading:

1. Back up database and media.
2. Deploy the new image.
3. Start the app.
4. Run a smoke test:
   - create survey,
   - vote once,
   - open results,
   - open admin,
   - rotate/revoke a test admin link,
   - upload media if media modes are used.

## Health Check

There is no dedicated `/healthz` route yet. For simple deployments, use `GET /`
as a liveness check.

## Scaling

Pairwise is built for small self-hosted deployments.

Current assumptions:

- one app process,
- local SQLite,
- local media directory,
- hundreds of active ideas per survey.

Running multiple app instances against the same SQLite file and media directory
is not the intended deployment model. If you need horizontal scaling, plan a
storage and locking design first.

