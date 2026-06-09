// Lightweight i18n. To add a language, add a catalog to `catalogs` below and an
// entry to `LOCALES` — nothing else needs to change.

export const DEFAULT_LOCALE = "da";

export const LOCALES: { code: string; name: string }[] = [
  { code: "da", name: "Dansk" },
  { code: "en", name: "English" },
];

type Catalog = Record<string, string>;

const da: Catalog = {
  "nav.results": "Resultater",
  "nav.vote": "Stem",
  "nav.admin": "Admin",
  "action.copy": "Kopiér",
  "action.copied": "Kopieret",
  "action.add": "Tilføj",
  "action.save": "Gem",
	  "footer.built": "Bygget med Bun + SQLite · inspireret af",
	  "footer.method": "Metode",
	  "footer.privacy": "Privatliv",
	  "theme.toggle": "Skift mellem lyst og mørkt tema",
  "lang.label": "Sprog",

  "home.hero.title": "Lad folk |vælge| — ikke rangere.",
  "home.hero.lead":
    "Vis to muligheder ad gangen og spørg: *hvilken foretrækker du?* En smart algoritme samler de mange små valg til én klar rangliste — og lader deltagerne tilføje deres egne idéer undervejs.",
  "home.create.title": "Opret et survey",
  "home.f.title.label": "Spørgsmål / titel",
  "home.f.title.ph": "Hvad er den bedste …?",
  "home.f.desc.label": "Beskrivelse",
  "home.f.desc.opt": "(valgfri)",
  "home.f.desc.ph": "Lidt kontekst til deltagerne.",
  "home.f.mode.label": "Hvad skal sammenlignes?",
  "mode.text": "Tekst",
  "mode.image": "Billeder",
  "mode.audio": "Lyd",
  "mode.video": "Video",
  "mode.text.desc": "Idéer som tekst",
  "mode.image.desc": "Billeder (gemmes som WebP)",
  "mode.audio.desc": "Lydklip",
  "mode.video.desc": "YouTube eller WebM",
  "home.f.ideas.label": "Start-idéer",
  "home.f.ideas.hint": "(én pr. linje, mindst 2)",
  "home.f.ideas.ph": "Mere cykelparkering\nFlere træer på torvet\nGratis wifi i parken",
  "home.f.images.label": "Billeder",
  "home.f.images.hint": "(vælg mindst 2 — de tilpasses automatisk til WebP)",
  "home.f.audio.label": "Lydfiler",
  "home.f.audio.hint": "(vælg mindst 2 — mp3, wav, ogg, m4a …)",
  "home.f.video.label": "YouTube-links",
  "home.f.video.hint": "(ét pr. linje — eller upload WebM-filer nedenfor)",
  "home.f.video.ph": "https://www.youtube.com/watch?v=…\nhttps://youtu.be/…",
  "home.f.webm.label": "…eller WebM-filer",
  "home.f.webm.hint": "(valgfrit, kan kombineres med YouTube-links)",
  "home.f.media.note": "Du kan altid tilføje flere bagefter i admin.",
  "home.toggle.user_ideas": "Lad deltagere foreslå egne idéer",
  "home.toggle.auto": "Udgiv forslag automatisk",
  "home.toggle.auto.hint": "(uden godkendelse)",
  "home.submit": "Opret survey →",
  "home.how.title": "Sådan virker det",
  "home.how.1.t": "Parvise valg",
  "home.how.1.b": "Deltagere ser to muligheder ad gangen og vælger den, de bedst kan lide. Hurtigt at svare på — også på mobilen.",
  "home.how.2.t": "Bayesiansk score",
  "home.how.2.b": "Hver mulighed får en score fra 0 til 100, der svarer til chancen for at slå en tilfældig anden. Nye idéer starter neutralt på 50.",
  "home.how.3.t": "Greedy udvælgelse",
  "home.how.3.b": "Algoritmen viser oftest de par, der mangler data, så ranglisten finder sit leje hurtigt — og nye forslag kommer med fra start.",

  "score.field.label": "Scoringmetode",
  "score.field.help": "Deltagerne stemmer stadig på samme måde; metoden ændrer kun ranglisten.",
  "score.field.learn": "Læs metoden",
  "score.bayesian": "Bayesiansk win-rate",
  "score.bayesian.desc":
    "Anbefalet standard. Nye muligheder starter neutralt, og scoren er en stabiliseret chance for at slå en tilfældig anden mulighed.",
  "score.raw": "Rå win-rate",
  "score.raw.desc":
    "Den simple andel af vundne valg. Let at forstå, men meget ustabil for muligheder med få stemmer.",
  "score.bradley_terry": "Bradley-Terry",
  "score.bradley_terry.desc":
    "En statistisk model, der justerer for modstandernes styrke. Bedre ved ujævne data, men mindre umiddelbar at forklare.",

  "method.title": "Sådan beregnes ranglisten",
  "method.lead":
    "Deltagerne gør altid det samme: de vælger mellem to muligheder. Algoritmen bestemmer kun, hvordan alle valgene samles til en rangliste.",
  "method.same.title": "Afstemningen er den samme",
  "method.same.body":
    "Uanset scoringmetode ser deltagerne to muligheder ad gangen og vælger den, de foretrækker. Det gør svarene hurtige og sammenlignelige.",
  "method.scoring.title": "Scoringmetoder",
  "method.scoring.body":
    "Når stemmerne er indsamlet, kan surveyet bruge forskellige metoder til at beregne scoren. De prioriterer forskellige ting: enkelhed, stabilitet eller statistisk justering.",
  "method.choice.title": "Hvad skal du vælge?",
  "method.choice.body":
    "Brug Bayesiansk win-rate som standard. Brug rå win-rate kun som reference. Brug Bradley-Terry, hvis du har mange stemmer og vil justere for, hvilke modstandere en mulighed har mødt.",
  "method.recommended": "Anbefalet",
	  "method.optional": "Valgfri",

  "privacy.title": "Privatliv og GDPR",
  "privacy.lead":
    "Pairwise er bygget til at indsamle valg med så få personoplysninger som muligt. Afstemninger er pseudonyme, ikke nødvendigvis fuldt anonyme.",
  "privacy.summary.title": "Kort fortalt",
  "privacy.summary.body":
    "Appen har ingen brugerprofiler, ingen e-mail-login, ingen indbygget analytics og ingen reklamecookies. Den gemmer dog tekniske cookies, stemmer, forslag og eventuelle uploads, fordi det er nødvendigt for at gennemføre et survey.",
  "privacy.controller.title": "Hvem er ansvarlig?",
  "privacy.controller.body":
    "Pairwise er self-hosted. Den organisation eller person, der driver den konkrete instans og opretter surveyet, er normalt dataansvarlig. Projektet leverer kun softwaren.",
  "privacy.data.title": "Hvilke oplysninger kan behandles?",
  "privacy.data.1": "Surveyets titel, beskrivelse, valgmuligheder og admin-indstillinger.",
  "privacy.data.2": "Stemmer, spring-over-handlinger og viste par knyttet til en tilfældig, signeret voter-id-cookie.",
  "privacy.data.3": "Deltagerforslag og captions, som kan indeholde personoplysninger, hvis brugeren selv skriver dem.",
  "privacy.data.4": "Uploadede billeder, lyd eller WebM-videoer, hvis surveyet bruger media-mode.",
  "privacy.data.5": "Sprogvalg i en cookie og tema-valg i browserens localStorage.",
  "privacy.data.6": "IP-adresser kan fremgå af server-, proxy- eller hostinglogs uden for selve appens SQLite-database.",
  "privacy.cookies.title": "Cookies og lokal lagring",
  "privacy.cookies.body":
    "Appen bruger kun funktionelle cookies: `pwid` holder styr på, hvilke par en deltager har set og besvaret, og `lang` husker sprogvalg. Tema gemmes i localStorage. Der bruges ikke tracking- eller marketingcookies i appen.",
  "privacy.legal.title": "Formål og retsgrundlag",
  "privacy.legal.body":
    "Formålet er at gennemføre et pairwise survey, forhindre dobbeltbesvarelser på samme viste par, vise resultater og give admin mulighed for moderation. For almindelige surveys vil retsgrundlaget typisk være legitim interesse eller samtykke afhængigt af kontekst og operatørens brug.",
  "privacy.retention.title": "Sletning og opbevaring",
  "privacy.retention.body":
    "Admin kan slette hele surveys og enkelte idéer. Ved sletning fjernes tilknyttede lokale mediefiler. Operatøren bør fastsætte en konkret opbevaringsperiode og sikre, at backups følger samme slettepolitik.",
  "privacy.third.title": "Tredjeparter",
  "privacy.third.body":
    "Appen sender ikke data til en analytics-tjeneste. Hvis et survey bruger YouTube-videoer, kan deltagerens browser kontakte YouTube/Google for at hente video eller thumbnail. Lokale uploads serveres fra instansen selv.",
  "privacy.rights.title": "Rettigheder",
  "privacy.rights.body":
    "Deltagere kan kontakte operatøren for indsigt, rettelse eller sletning. Fordi appen ikke har login eller e-mail, kan operatøren kun finde en deltager på baggrund af oplysninger, deltageren selv kan levere, f.eks. survey-link, tidspunkt eller voter-cookie.",
  "privacy.note.title": "Vigtigt",
  "privacy.note.body":
    "Hvis et survey beder om følsomme oplysninger, billeder af personer eller interne medarbejderdata, skal operatøren selv lave den nødvendige vurdering, information og eventuelt databehandleraftaler.",

	  "err.title_required": "Giv dit survey en titel.",
  "err.min_ideas": "Tilføj mindst 2 start-idéer (én pr. linje).",
  "err.min_media": "Tilføj mindst 2 medier (eller opret nu og tilføj dem i admin).",
  "err.payload_too_large": "Uploadet er for stort.",
  "err.text_too_long": "Titlen eller beskrivelsen er for lang.",
  "err.ideas_too_large": "Tilføj højst 500 start-idéer, og hold hver idé under 280 tegn.",

  "created.badge": "✓ Survey oprettet",
  "created.lead": "Gem disse links. Du kan ikke få det hemmelige admin-link igen.",
  "created.vote.label": "Stemme-link",
  "created.vote.hint": "Del dette med deltagerne",
  "created.results.label": "Resultat-link",
  "created.results.hint": "Offentlig rangliste",
  "created.admin.label": "Admin-link 🔒",
  "created.admin.hint": "Hemmeligt — kun til dig: godkend forslag, redigér, se statistik",
  "created.start": "Start afstemning →",
  "created.to_admin": "Til admin",

  "vote.sub": "Hvilken foretrækker du?",
  "vote.count": "{n} stemmer",
  "vote.skip": "Kan ikke vælge ↓",
  "vote.results": "Se resultater",
  "vote.pick": "Vælg",
  "vote.add.title": "Har du en bedre idé?",
  "vote.add.ph": "Skriv dit eget forslag …",
  "vote.add.note.moderated": "Dit forslag sendes til godkendelse, før det kommer med.",
  "vote.add.note.auto": "Dit forslag kommer med i afstemningen med det samme.",
  "vote.empty": "Der skal mindst 2 aktive muligheder til, før afstemningen kan starte.",
  "vote.empty.media": "Der mangler aktive muligheder for at kunne stemme.",
  "vote.done": "Der er ikke flere par at vise lige nu. Tak for dine svar.",
  "toast.added_live": "Tilføjet — den er nu med",
  "toast.added_pending": "Sendt til godkendelse",
  "toast.add_failed": "Kunne ikke tilføje idéen. Prøv igen.",
  "toast.error": "Noget gik galt — prøv igen.",

  "results.subtitle": "Rangliste",
  "results.vote": "Stem →",
  "results.refresh": "Opdatér",
  "results.meta": "{w} sejre · {l} tab · {a} visninger",
  "results.method": "Beregnet med",
  "results.empty": "Ingen aktive muligheder endnu.",

  "admin.title": "Admin",
  "admin.stat.votes": "stemmer",
  "admin.stat.active": "aktive",
  "admin.stat.pending": "afventer",
  "admin.stat.skips": "spring over",
  "admin.vote_page": "Stemme-side",
  "admin.results": "Resultater",
  "admin.mode_label": "Type",
  "admin.pending.title": "Forslag",
  "admin.pending.empty": "Ingen forslag venter på godkendelse.",
  "admin.approve": "Godkend",
  "admin.reject": "Afvis",
  "admin.add.title": "Tilføj",
  "admin.add.ph": "Ny idé til afstemningen …",
  "admin.add.video.ph": "YouTube-link …",
  "admin.active.title": "Aktive muligheder",
  "admin.active.empty": "Ingen aktive muligheder.",
  "admin.hide": "Skjul",
  "admin.delete": "Slet",
  "admin.confirm.reject": "Afvis forslaget?",
  "admin.confirm.delete": "Slet permanent? Stemmer bevares ikke.",
  "admin.settings.title": "Indstillinger",
  "admin.settings.save": "Gem indstillinger",

  "nf.lead": "Den side findes ikke — linket kan være forkert eller udløbet.",
  "nf.back": "Tilbage til forsiden",
};

const en: Catalog = {
  "nav.results": "Results",
  "nav.vote": "Vote",
  "nav.admin": "Admin",
  "action.copy": "Copy",
  "action.copied": "Copied",
  "action.add": "Add",
  "action.save": "Save",
	  "footer.built": "Built with Bun + SQLite · inspired by",
	  "footer.method": "Method",
	  "footer.privacy": "Privacy",
	  "theme.toggle": "Toggle light and dark theme",
  "lang.label": "Language",

  "home.hero.title": "Let people |choose| — not rank.",
  "home.hero.lead":
    "Show two options at a time and ask: *which do you prefer?* A smart algorithm turns the many small choices into one clear ranking — and lets participants add their own ideas along the way.",
  "home.create.title": "Create a survey",
  "home.f.title.label": "Question / title",
  "home.f.title.ph": "What's the best …?",
  "home.f.desc.label": "Description",
  "home.f.desc.opt": "(optional)",
  "home.f.desc.ph": "A little context for participants.",
  "home.f.mode.label": "What gets compared?",
  "mode.text": "Text",
  "mode.image": "Images",
  "mode.audio": "Audio",
  "mode.video": "Video",
  "mode.text.desc": "Ideas as text",
  "mode.image.desc": "Images (stored as WebP)",
  "mode.audio.desc": "Audio clips",
  "mode.video.desc": "YouTube or WebM",
  "home.f.ideas.label": "Starting ideas",
  "home.f.ideas.hint": "(one per line, at least 2)",
  "home.f.ideas.ph": "More bike parking\nMore trees in the square\nFree wifi in the park",
  "home.f.images.label": "Images",
  "home.f.images.hint": "(pick at least 2 — they're auto-converted to WebP)",
  "home.f.audio.label": "Audio files",
  "home.f.audio.hint": "(pick at least 2 — mp3, wav, ogg, m4a …)",
  "home.f.video.label": "YouTube links",
  "home.f.video.hint": "(one per line — or upload WebM files below)",
  "home.f.video.ph": "https://www.youtube.com/watch?v=…\nhttps://youtu.be/…",
  "home.f.webm.label": "…or WebM files",
  "home.f.webm.hint": "(optional, can be combined with YouTube links)",
  "home.f.media.note": "You can always add more later in admin.",
  "home.toggle.user_ideas": "Let participants suggest their own ideas",
  "home.toggle.auto": "Publish suggestions automatically",
  "home.toggle.auto.hint": "(without approval)",
  "home.submit": "Create survey →",
  "home.how.title": "How it works",
  "home.how.1.t": "Pairwise choices",
  "home.how.1.b": "Participants see two options at a time and pick the one they like best. Quick to answer — on mobile too.",
  "home.how.2.t": "Bayesian score",
  "home.how.2.b": "Each option gets a score from 0 to 100 — the chance it beats a random other one. New ideas start neutral at 50.",
  "home.how.3.t": "Greedy selection",
  "home.how.3.b": "The algorithm mostly shows the pairs that lack data, so the ranking settles fast — and new suggestions join from the start.",

  "score.field.label": "Scoring method",
  "score.field.help": "Participants still vote the same way; this only changes the ranking calculation.",
  "score.field.learn": "Read the method",
  "score.bayesian": "Bayesian win rate",
  "score.bayesian.desc":
    "Recommended default. New options start neutral, and the score is a stabilized chance of beating a random other option.",
  "score.raw": "Raw win rate",
  "score.raw.desc":
    "The simple share of won choices. Easy to understand, but very unstable for options with few votes.",
  "score.bradley_terry": "Bradley-Terry",
  "score.bradley_terry.desc":
    "A statistical model that adjusts for opponent strength. Better for uneven data, but less immediately explainable.",

  "method.title": "How the ranking is calculated",
  "method.lead":
    "Participants always do the same thing: choose between two options. The algorithm only decides how those choices become a ranking.",
  "method.same.title": "Voting stays the same",
  "method.same.body":
    "No matter which scoring method is selected, participants see two options at a time and choose the one they prefer. That keeps answers quick and comparable.",
  "method.scoring.title": "Scoring methods",
  "method.scoring.body":
    "After votes are collected, the survey can use different methods to calculate scores. They prioritize different things: simplicity, stability, or statistical adjustment.",
  "method.choice.title": "What should you choose?",
  "method.choice.body":
    "Use Bayesian win rate as the default. Use raw win rate only as a reference. Use Bradley-Terry when you have many votes and want to adjust for which opponents each option has faced.",
	  "method.recommended": "Recommended",
	  "method.optional": "Optional",

  "privacy.title": "Privacy and GDPR",
  "privacy.lead":
    "Pairwise is designed to collect choices with as little personal data as possible. Votes are pseudonymous, not necessarily fully anonymous.",
  "privacy.summary.title": "In short",
  "privacy.summary.body":
    "The app has no user profiles, no email login, no built-in analytics, and no advertising cookies. It does store technical cookies, votes, suggestions, and optional uploads because that is necessary to run a survey.",
  "privacy.controller.title": "Who is responsible?",
  "privacy.controller.body":
    "Pairwise is self-hosted. The person or organisation operating a specific instance and creating a survey is normally the controller. The project only provides the software.",
  "privacy.data.title": "What data may be processed?",
  "privacy.data.1": "Survey title, description, options, and admin settings.",
  "privacy.data.2": "Votes, skips, and shown pairs linked to a random signed voter-id cookie.",
  "privacy.data.3": "Participant suggestions and captions, which may contain personal data if users write it themselves.",
  "privacy.data.4": "Uploaded images, audio, or WebM videos when a survey uses media mode.",
  "privacy.data.5": "Language choice in a cookie and theme choice in browser localStorage.",
  "privacy.data.6": "IP addresses may appear in server, proxy, or hosting logs outside the app's SQLite database.",
  "privacy.cookies.title": "Cookies and local storage",
  "privacy.cookies.body":
    "The app only uses functional cookies: `pwid` tracks which pairs a participant has seen and answered, and `lang` remembers language choice. Theme is stored in localStorage. The app does not use tracking or marketing cookies.",
  "privacy.legal.title": "Purpose and legal basis",
  "privacy.legal.body":
    "The purpose is to run a pairwise survey, prevent double answers for the same shown pair, display results, and let admins moderate submissions. For ordinary surveys, the legal basis will typically be legitimate interest or consent depending on context and the operator's use.",
  "privacy.retention.title": "Deletion and retention",
  "privacy.retention.body":
    "Admins can delete whole surveys and individual ideas. Deleting removes associated local media files. The operator should set a concrete retention period and ensure backups follow the same deletion policy.",
  "privacy.third.title": "Third parties",
  "privacy.third.body":
    "The app does not send data to an analytics service. If a survey uses YouTube videos, the participant's browser may contact YouTube/Google to load video or thumbnails. Local uploads are served by the instance itself.",
  "privacy.rights.title": "Rights",
  "privacy.rights.body":
    "Participants can contact the operator for access, correction, or deletion. Because the app has no login or email account, the operator can only find a participant from information the participant can provide, such as survey link, time, or voter cookie.",
  "privacy.note.title": "Important",
  "privacy.note.body":
    "If a survey asks for sensitive information, images of people, or internal employee data, the operator must make the necessary assessment, provide proper information, and arrange any required data processing agreements.",

	  "err.title_required": "Give your survey a title.",
  "err.min_ideas": "Add at least 2 starting ideas (one per line).",
  "err.min_media": "Add at least 2 media items (or create now and add them in admin).",
  "err.payload_too_large": "The upload is too large.",
  "err.text_too_long": "The title or description is too long.",
  "err.ideas_too_large": "Add at most 500 starting ideas, and keep each idea under 280 characters.",

  "created.badge": "✓ Survey created",
  "created.lead": "Save these links. You can't get the secret admin link again.",
  "created.vote.label": "Vote link",
  "created.vote.hint": "Share this with participants",
  "created.results.label": "Results link",
  "created.results.hint": "Public ranking",
  "created.admin.label": "Admin link 🔒",
  "created.admin.hint": "Secret — just for you: approve suggestions, edit, see stats",
  "created.start": "Start voting →",
  "created.to_admin": "Go to admin",

  "vote.sub": "Which do you prefer?",
  "vote.count": "{n} votes",
  "vote.skip": "Can't decide ↓",
  "vote.results": "See results",
  "vote.pick": "Choose",
  "vote.add.title": "Got a better idea?",
  "vote.add.ph": "Write your own suggestion …",
  "vote.add.note.moderated": "Your suggestion goes to approval before it joins.",
  "vote.add.note.auto": "Your suggestion joins the vote right away.",
  "vote.empty": "At least 2 active options are needed before voting can start.",
  "vote.empty.media": "There aren't enough active options to vote yet.",
  "vote.done": "No more pairs to show right now. Thanks for your answers.",
  "toast.added_live": "Added — it's in the vote now",
  "toast.added_pending": "Sent for approval",
  "toast.add_failed": "Couldn't add the idea. Try again.",
  "toast.error": "Something went wrong — try again.",

  "results.subtitle": "Ranking",
  "results.vote": "Vote →",
  "results.refresh": "Refresh",
  "results.meta": "{w} wins · {l} losses · {a} shown",
  "results.method": "Calculated with",
  "results.empty": "No active options yet.",

  "admin.title": "Admin",
  "admin.stat.votes": "votes",
  "admin.stat.active": "active",
  "admin.stat.pending": "pending",
  "admin.stat.skips": "skips",
  "admin.vote_page": "Vote page",
  "admin.results": "Results",
  "admin.mode_label": "Type",
  "admin.pending.title": "Suggestions",
  "admin.pending.empty": "No suggestions awaiting approval.",
  "admin.approve": "Approve",
  "admin.reject": "Reject",
  "admin.add.title": "Add",
  "admin.add.ph": "New idea for the vote …",
  "admin.add.video.ph": "YouTube link …",
  "admin.active.title": "Active options",
  "admin.active.empty": "No active options.",
  "admin.hide": "Hide",
  "admin.delete": "Delete",
  "admin.confirm.reject": "Reject this suggestion?",
  "admin.confirm.delete": "Delete permanently? Votes are not kept.",
  "admin.settings.title": "Settings",
  "admin.settings.save": "Save settings",

  "nf.lead": "That page doesn't exist — the link may be wrong or expired.",
  "nf.back": "Back to home",
};

const catalogs: Record<string, Catalog> = { da, en };

export type Translator = (key: string, vars?: Record<string, string | number>) => string;

export function isLocale(code: string | undefined | null): boolean {
  return !!code && code in catalogs;
}

/** Build a translator bound to a locale, falling back to the default catalog. */
export function translator(locale: string): Translator {
  const cat = catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
  const fallback = catalogs[DEFAULT_LOCALE];
  return (key, vars) => {
    let s = cat[key] ?? fallback[key] ?? key;
    if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, String(vars[k]));
    return s;
  };
}

/**
 * Turn a trusted catalog string's inline markers into HTML:
 *   |word|  → <em>word</em>      *word* → <strong>word</strong>
 * Only ever call this on catalog text, never on user input.
 */
export function rich(s: string): string {
  return s
    .replace(/\|([^|]+)\|/g, "<em>$1</em>")
    .replace(/\*([^*]+)\*/g, "<strong>$1</strong>");
}

/** Resolve the active locale from an explicit value, cookie, or Accept-Language. */
export function pickLocale(explicit?: string, cookie?: string, acceptLanguage?: string): string {
  if (isLocale(explicit)) return explicit!;
  if (isLocale(cookie)) return cookie!;
  if (acceptLanguage) {
    for (const part of acceptLanguage.split(",")) {
      const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
      if (isLocale(code)) return code;
    }
  }
  return DEFAULT_LOCALE;
}
