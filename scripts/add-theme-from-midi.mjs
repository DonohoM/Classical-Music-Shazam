#!/usr/bin/env node
// Extracts a melody line from a MIDI file and appends it to src/data/themes.json.
//
// Usage:
//   node scripts/add-theme-from-midi.mjs --file path/to.mid --id some-id \
//     --title "Piece Title" --composer "Composer Name" \
//     [--track 0] [--offset 0] [--limit 12]
//
// Good public-domain MIDI sources for classical incipits: Mutopia Project
// (mutopiaproject.org), IMSLP piece pages, and MuseScore.com public scores.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import tonejsMidi from "@tonejs/midi";
const { Midi } = tonejsMidi;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      args[arg.slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

function fail(message) {
  console.error(message);
  console.error(
    'Usage: node scripts/add-theme-from-midi.mjs --file path.mid --id some-id --title "Title" --composer "Composer" [--track 0] [--offset 0] [--limit 12]',
  );
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
for (const key of ["file", "id", "title", "composer"]) {
  if (!args[key]) fail(`Missing required --${key}`);
}

const offset = args.offset !== undefined ? parseInt(args.offset, 10) : 0;
const limit = args.limit !== undefined ? parseInt(args.limit, 10) : 12;

let midi;
try {
  midi = new Midi(readFileSync(args.file));
} catch (err) {
  fail(`Could not read/parse MIDI file "${args.file}": ${err.message}`);
}

const tracksWithNotes = midi.tracks.filter((t) => t.notes.length > 0);
if (tracksWithNotes.length === 0) {
  fail("No tracks with notes found in this MIDI file.");
}

let track;
if (args.track !== undefined) {
  const idx = parseInt(args.track, 10);
  track = midi.tracks[idx];
  if (!track || track.notes.length === 0) {
    fail(`Track ${idx} has no notes.`);
  }
} else if (tracksWithNotes.length === 1) {
  track = tracksWithNotes[0];
} else {
  console.log("Multiple tracks with notes — pick one with --track <index>:");
  for (const t of tracksWithNotes) {
    const idx = midi.tracks.indexOf(t);
    console.log(`  [${idx}] "${t.name || "(untitled)"}" — ${t.notes.length} notes`);
  }
  process.exit(1);
}

const sortedNotes = [...track.notes].sort((a, b) => a.time - b.time);
const slice = sortedNotes.slice(offset, offset + limit);
if (slice.length < 2) {
  fail(
    `Selected range has only ${slice.length} note(s) (track has ${sortedNotes.length} total) — adjust --offset/--limit.`,
  );
}

const noteNames = slice.map((n) => n.name);

const themesPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/data/themes.json",
);
const themes = JSON.parse(readFileSync(themesPath, "utf8"));

if (themes.some((t) => t.id === args.id)) {
  fail(`A theme with id "${args.id}" already exists in themes.json.`);
}

themes.push({
  id: args.id,
  title: args.title,
  composer: args.composer,
  notes: noteNames,
});

writeFileSync(themesPath, JSON.stringify(themes, null, 2) + "\n");

console.log(`Added "${args.title}" (${args.id}) — ${noteNames.length} notes:`);
console.log(`  ${noteNames.join(" ")}`);
console.log(`\nReview the diff in ${path.relative(process.cwd(), themesPath)} before committing.`);
