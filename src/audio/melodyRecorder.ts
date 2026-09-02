import type { NoteInfo } from "./noteUtils";

const MIN_STABLE_FRAMES = 5; // ~5 frames of a held pitch before it counts as a note
const MIN_CONFIDENCE = 0.85;

/**
 * Turns a stream of per-frame pitch estimates into a sequence of distinct
 * held notes, filtering out short blips (attack transients, vibrato wobble,
 * noise) so a hummed melody becomes a clean note list.
 */
export class MelodyRecorder {
  private committed: number[] = [];
  private candidateMidi: number | null = null;
  private candidateCount = 0;
  private lastCommittedMidi: number | null = null;

  addFrame(note: NoteInfo | null, confidence: number): void {
    if (note === null || confidence < MIN_CONFIDENCE) {
      this.candidateMidi = null;
      this.candidateCount = 0;
      return;
    }

    if (note.midi === this.candidateMidi) {
      this.candidateCount++;
    } else {
      this.candidateMidi = note.midi;
      this.candidateCount = 1;
    }

    if (
      this.candidateCount === MIN_STABLE_FRAMES &&
      note.midi !== this.lastCommittedMidi
    ) {
      this.committed.push(note.midi);
      this.lastCommittedMidi = note.midi;
    }
  }

  getMidiSequence(): number[] {
    return [...this.committed];
  }

  reset(): void {
    this.committed = [];
    this.candidateMidi = null;
    this.candidateCount = 0;
    this.lastCommittedMidi = null;
  }
}
