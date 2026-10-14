import rawThemes from "../data/themes.json";

export interface Theme {
  id: string;
  title: string;
  composer: string;
  notes: string[];
  midi: number[];
  intervals: number[];
}

const NOTE_LETTER_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Parses a note name like "C#4" or "Bb3" into a MIDI note number. */
export function noteNameToMidi(name: string): number {
  const match = /^([A-G])(#|b)?(-?\d+)$/.exec(name);
  if (!match) {
    throw new Error(`Invalid note name: ${name}`);
  }
  const [, letter, accidental, octaveStr] = match;
  let semitone = NOTE_LETTER_SEMITONE[letter];
  if (accidental === "#") semitone += 1;
  if (accidental === "b") semitone -= 1;
  const octave = parseInt(octaveStr, 10);
  return (octave + 1) * 12 + semitone;
}

export function toIntervals(midiSequence: number[]): number[] {
  const intervals: number[] = [];
  for (let i = 1; i < midiSequence.length; i++) {
    intervals.push(midiSequence[i] - midiSequence[i - 1]);
  }
  return intervals;
}

/**
 * Collapses consecutive repeated pitches (e.g. G4, G4, G4 -> G4). The live
 * melody recorder never emits a repeat back-to-back, so database entries
 * must be normalized the same way or held/repeated notes (very common in
 * real melodies) silently degrade matching.
 */
function dedupeConsecutive(sequence: number[]): number[] {
  return sequence.filter((value, index) => index === 0 || value !== sequence[index - 1]);
}

export function loadThemes(): Theme[] {
  return (rawThemes as Array<Omit<Theme, "midi" | "intervals">>).map(
    (theme) => {
      const midi = dedupeConsecutive(theme.notes.map(noteNameToMidi));
      return { ...theme, midi, intervals: toIntervals(midi) };
    },
  );
}
