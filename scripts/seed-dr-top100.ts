import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { addIdea, createSurvey, updateIdeaMedia } from "../src/db.ts";
import { MEDIA_PATH } from "../src/media.ts";

const API_URL = "https://api.dr.dk/top100/reveal";
const TRACK_BASE_URL = "https://www.dr.dk/nyheder/htm/grafik/2026/top100/tracks/";

interface DrSong {
  _id: string;
  title: string;
  artist: string;
  year: string;
  sound: string;
}

interface DrRevealResponse {
  songs: DrSong[];
}

function songLabel(song: DrSong, rank: number): string {
  const year = song.year ? ` (${song.year})` : "";
  return `DR #${rank}: ${song.title} - ${song.artist}${year}`;
}

function trackUrl(filename: string): string {
  return TRACK_BASE_URL + encodeURIComponent(filename);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { "user-agent": "Pairwise local seed script" } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.json() as Promise<T>;
}

async function downloadTrack(filename: string): Promise<ArrayBuffer> {
  const response = await fetch(trackUrl(filename), { headers: { "user-agent": "Pairwise local seed script" } });
  if (!response.ok) throw new Error(`Failed to download ${filename}: ${response.status}`);
  return response.arrayBuffer();
}

async function main(): Promise<void> {
  const reveal = await fetchJson<DrRevealResponse>(API_URL);
  const songs = reveal.songs ?? [];
  if (songs.length !== 100) throw new Error(`Expected 100 songs from DR, got ${songs.length}`);
  const missingSound = songs.filter((song) => !song.sound);
  if (missingSound.length) throw new Error(`Missing sound files for ${missingSound.length} songs`);

  const survey = createSurvey({
    title: "DR TOP100 - yndlingssang",
    description: "Privat lokal pairwise-afstemning baseret på DR's TOP100-liste.",
    mode: "audio",
    score_method: "bayesian",
    allow_user_ideas: false,
    auto_activate: false,
  });

  const surveyMediaDir = join(MEDIA_PATH, String(survey.id));
  mkdirSync(surveyMediaDir, { recursive: true });

  for (const [index, song] of songs.entries()) {
    const rank = 100 - index;
    const idea = addIdea(survey.id, {
      text: songLabel(song, rank),
      active: true,
      submitted: false,
      media_kind: "audio",
    });
    const rel = `${survey.id}/${idea.id}.mp3`;
    const bytes = await downloadTrack(song.sound);
    await Bun.write(join(MEDIA_PATH, rel), bytes);
    updateIdeaMedia(idea.id, rel, "audio");
    console.log(`${String(index + 1).padStart(3, " ")}/100 downloaded ${songLabel(song, rank)}`);
  }

  console.log("");
  console.log("DR TOP100 survey ready");
  console.log(`Vote:    http://localhost:3000/s/${survey.slug}`);
  console.log(`Results: http://localhost:3000/s/${survey.slug}/results`);
  console.log(`Admin:   http://localhost:3000/a/${survey.admin_token}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

