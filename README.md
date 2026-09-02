# Classical Music Shazam

A browser app that listens through the microphone and:

1. **Live pitch/key display** — shows the current note (with cents-off tuning) and a rolling estimate of the musical key, using pitch detection (YIN algorithm) and Krumhansl-Schmuckler key-finding.
2. **Melody identification** — record yourself humming or playing a theme, and the app matches the note pattern against a small seed database of famous classical themes.

## Running it

```bash
npm install
npm run dev
```

Open the printed `localhost` URL and click **Start Listening** (grant microphone access when prompted).

## How it works

- `src/audio/pitchDetector.ts` — YIN pitch detection on raw mic samples.
- `src/audio/keyFinder.ts` — rolling pitch-class histogram + Krumhansl-Schmuckler correlation to estimate the current key.
- `src/audio/melodyRecorder.ts` — turns per-frame pitch estimates into a clean sequence of held notes (filters out short blips/noise).
- `src/matching/database.ts` + `src/data/themes.json` — the seed melody database, stored as note names and converted to transposition-invariant semitone-interval sequences.
- `src/matching/matcher.ts` — fuzzy sliding-window edit-distance matching between your hummed interval sequence and each theme, so it doesn't need to start exactly on beat one.

## Scope and limitations

- **Monophonic only.** Pitch detection assumes one note at a time (humming, whistling, a single-line instrument). It won't parse full chords or polyphonic passages — extending to chord recognition would need a chromagram/template-matching approach instead of YIN.
- **Seed database is small and hand-transcribed.** The ~14 themes in `themes.json` were entered from memory of well-known incipits, not sourced from verified scores — treat them as approximate, especially for the less universally-known ones (e.g. "Ride of the Valkyries", "Spring"). The matcher is fuzzy enough to tolerate small errors, but for higher accuracy, replace entries with pitches sourced from MusicXML/MIDI (e.g. the `music21` corpus or IMSLP scores).
- **Not audio fingerprinting.** This does not compare against actual recordings (that's how real Shazam works, and only identifies exact known recordings). It compares melodic contour, so it works for a hummed/whistled/played rendition even if the tempo or key differs from any reference recording.
- **Adding themes**: append an entry to `src/data/themes.json` with an `id`, `title`, `composer`, and `notes` (array of note names like `"C#4"`, `"Bb3"`) — everything else is derived automatically.
