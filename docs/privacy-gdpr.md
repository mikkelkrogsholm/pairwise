# Privacy and GDPR Notes

This document describes Pairwise's privacy posture for operators. It is product
documentation, not legal advice.

Pairwise is self-hosted software. The person or organisation operating a
Pairwise instance and deciding why a survey is run will normally be the
controller for that processing. Hosting providers or other infrastructure
vendors may be processors depending on the deployment.

## Design Goal

Pairwise is designed for data minimisation:

- no user accounts,
- no email login,
- no built-in analytics,
- no advertising or marketing cookies,
- survey-specific voter cookies,
- local uploads served by the Pairwise instance,
- click-to-load YouTube embeds.

The app can still process personal data if survey text, participant suggestions,
uploads, captions, server logs, or IP addresses relate to identifiable people.
Treat votes as pseudonymous rather than fully anonymous.

## Data Inventory

| Data | Where | Purpose | Notes |
| --- | --- | --- | --- |
| Survey title and description | SQLite | Run and display the survey | May contain personal data if entered by admin |
| Ideas and captions | SQLite | Options shown to participants | Participant suggestions can contain personal data |
| Votes and skips | SQLite | Ranking and audit of answered appearances | Linked to a random voter id, not an account |
| Pair appearances | SQLite | Prevent double-answering a shown pair | Contains lookup token and voter id |
| Admin link hashes | SQLite | Authenticate survey admins | Raw admin tokens are not stored in plaintext |
| CSRF tokens | SQLite | Protect admin mutations | One token per admin link |
| Uploaded media | `MEDIA_PATH` | Display image/audio/WebM options | Can contain personal data, including images of people |
| Voter cookie | Browser cookie | Tie a browser to shown/answered pairs for one survey | `pwid_<slug>`, scoped to `/api/s/<slug>` |
| Language cookie | Browser cookie | Remember interface language | Functional cookie |
| Theme preference | Browser `localStorage` | Remember light/dark theme | Functional local storage |
| Server/proxy logs | Hosting layer | Operations/security | Outside Pairwise's SQLite database |

## Cookies and Consent Posture

Pairwise only sets functional or technically necessary storage:

- `pwid_<slug>` is needed to keep the pairwise voting flow consistent and avoid
  double-answering shown pairs.
- `lang` remembers the chosen interface language.
- `localStorage.theme` remembers visual preference.

The app does not set analytics, tracking, advertising, or cross-site marketing
cookies.

For Danish operators, the Digitaliseringsstyrelsen cookievejledning says consent
is not required for cookies and similar technologies that are technically
necessary for a service's intended functionality, as long as the collected
information is not used for other purposes. Datatilsynet's cookie guidance also
emphasises that non-necessary cookies require consent before they are set.

Sources:

- [Digitaliseringsstyrelsen: Cookievejledningen](https://digst.dk/tilsyn/sporingsteknologiomraadet/cookievejledningen/)
- [Datatilsynet: Cookies og GDPR](https://www.datatilsynet.dk/regler-og-vejledning/gdpr-univers-for-smaa-virksomheder/cookies-og-gdpr)
- [Datatilsynet: Cookies og lignende teknologier](https://www.datatilsynet.dk/regler-og-vejledning/cookies-og-lignende-teknologier)

## Legal Basis

Pairwise cannot choose the legal basis for an operator. Depending on the survey
context, a controller may consider legitimate interests, consent, contract, legal
obligation, or another basis.

Datatilsynet notes that consent is only one of several possible legal bases for
processing personal data. If relying on consent, make sure it is freely given,
specific, informed, unambiguous, and withdrawable.

Sources:

- [Datatilsynet: Samtykke](https://www.datatilsynet.dk/borger/samtykke)
- [EDPB Guidelines 05/2020 on consent](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf)
- [GDPR Article 24: Responsibility of the controller](https://gdpr.eu/article-24-responsibility-of-the-data-controller/)

## Third Parties

Pairwise itself does not send data to an analytics service.

YouTube videos are different: the server-rendered pages do not load third-party
thumbnails, and the voting UI uses a click-to-load button with
`youtube-nocookie.com`. A participant's browser contacts YouTube/Google only
after the participant chooses to load a YouTube video.

If an operator deploys Pairwise behind a CDN, external proxy, analytics script,
error tracker, or managed hosting platform, that deployment adds its own privacy
and data processing considerations.

## Retention and Deletion

Pairwise supports deleting:

- individual ideas,
- whole surveys,
- associated local media files.

Operators should define:

- how long surveys remain open,
- when closed surveys are archived,
- when surveys are deleted,
- how long SQLite and media backups are retained,
- who can request deletion or access.

Backups are outside the app's runtime deletion flow. If backups contain personal
data, they need a matching retention policy.

## Data Subject Requests

Pairwise has no accounts and no email addresses. A participant request may be
hard to identify unless the participant can provide contextual information such
as:

- survey link,
- approximate time,
- the browser's voter cookie,
- the submitted text/media.

Operators should document a practical process for access, correction, deletion,
and objection requests.

## When to Do More

Do a fuller privacy assessment before using Pairwise for:

- sensitive categories of personal data,
- employee monitoring or internal HR decisions,
- children or vulnerable groups,
- images or audio of identifiable people,
- political, union, health, religious, or similar topics,
- public uploads from untrusted participants,
- deployments with third-party analytics or tracking.

