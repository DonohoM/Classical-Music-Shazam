const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const A4_FREQ = 440;
const A4_MIDI = 69;

export interface NoteInfo {
  midi: number;
  pitchClass: number; // 0-11, 0 = C
  name: string; // e.g. "A4"
  octave: number;
  centsOff: number; // deviation from the nearest equal-tempered semitone
}

/** Converts a frequency in Hz to the nearest note, with cents-off tuning info. */
export function frequencyToNote(freq: number): NoteInfo {
  const midiFloat = A4_MIDI + 12 * Math.log2(freq / A4_FREQ);
  const midi = Math.round(midiFloat);
  const centsOff = Math.round((midiFloat - midi) * 100);
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return {
    midi,
    pitchClass,
    name: `${NOTE_NAMES[pitchClass]}${octave}`,
    octave,
    centsOff,
  };
}

export function pitchClassName(pitchClass: number): string {
  return NOTE_NAMES[((pitchClass % 12) + 12) % 12];
}

export function midiToNoteName(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pitchClass]}${octave}`;
}
