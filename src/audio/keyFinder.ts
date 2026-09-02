import { pitchClassName } from "./noteUtils";

// Krumhansl-Kessler key profiles: relative perceived stability of each
// pitch class within a major/minor key, rooted at pitch class 0.
const MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];
const MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

export interface KeyEstimate {
  name: string; // e.g. "D major"
  correlation: number; // -1..1, higher = more confident
}

function correlate(profile: number[], histogram: number[]): number {
  const n = profile.length;
  const meanP = profile.reduce((a, b) => a + b, 0) / n;
  const meanH = histogram.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denomP = 0;
  let denomH = 0;
  for (let i = 0; i < n; i++) {
    const dp = profile[i] - meanP;
    const dh = histogram[i] - meanH;
    num += dp * dh;
    denomP += dp * dp;
    denomH += dh * dh;
  }
  const denom = Math.sqrt(denomP * denomH);
  return denom === 0 ? 0 : num / denom;
}

/**
 * Given a 12-bin pitch-class weight histogram (index 0 = C), finds the
 * best-fitting major/minor key via Krumhansl-Schmuckler correlation.
 */
export function estimateKey(histogram: number[]): KeyEstimate {
  let best: KeyEstimate = { name: "—", correlation: -Infinity };

  for (let root = 0; root < 12; root++) {
    const rotatedMajor = MAJOR_PROFILE.map(
      (_, i) => MAJOR_PROFILE[(i - root + 12) % 12],
    );
    const rotatedMinor = MINOR_PROFILE.map(
      (_, i) => MINOR_PROFILE[(i - root + 12) % 12],
    );

    const majorScore = correlate(rotatedMajor, histogram);
    if (majorScore > best.correlation) {
      best = { name: `${pitchClassName(root)} major`, correlation: majorScore };
    }
    const minorScore = correlate(rotatedMinor, histogram);
    if (minorScore > best.correlation) {
      best = { name: `${pitchClassName(root)} minor`, correlation: minorScore };
    }
  }

  return best;
}

/** Rolling, time-decayed histogram of pitch-class weight for live key tracking. */
export class PitchClassHistogram {
  private weights = new Array(12).fill(0);

  constructor(private readonly decay = 0.985) {}

  add(pitchClass: number, amount = 1) {
    this.weights = this.weights.map((w) => w * this.decay);
    this.weights[pitchClass] += amount;
  }

  snapshot(): number[] {
    return [...this.weights];
  }

  totalWeight(): number {
    return this.weights.reduce((a, b) => a + b, 0);
  }
}
