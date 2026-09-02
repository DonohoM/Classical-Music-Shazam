export interface PitchResult {
  frequency: number;
  /** 0 (bad) to 1 (very confident); derived from the YIN CMNDF minimum. */
  confidence: number;
}

const YIN_THRESHOLD = 0.15;

/**
 * YIN pitch detection algorithm (de Cheveigne & Kawahara, 2002).
 * Operates on a single frame of time-domain samples and returns the
 * estimated fundamental frequency, or null if no clear pitch was found.
 */
export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
): PitchResult | null {
  const halfLength = Math.floor(buffer.length / 2);
  const difference = new Float32Array(halfLength);

  // Step 1-2: difference function
  for (let lag = 0; lag < halfLength; lag++) {
    let sum = 0;
    for (let i = 0; i < halfLength; i++) {
      const delta = buffer[i] - buffer[i + lag];
      sum += delta * delta;
    }
    difference[lag] = sum;
  }

  // Step 3: cumulative mean normalized difference function (CMNDF)
  const cmndf = new Float32Array(halfLength);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let lag = 1; lag < halfLength; lag++) {
    runningSum += difference[lag];
    cmndf[lag] = (difference[lag] * lag) / runningSum;
  }

  // Step 4: absolute threshold — first dip below threshold
  let tau = -1;
  for (let lag = 2; lag < halfLength - 1; lag++) {
    if (cmndf[lag] < YIN_THRESHOLD) {
      // walk to the local minimum
      let localTau = lag;
      while (
        localTau + 1 < halfLength &&
        cmndf[localTau + 1] < cmndf[localTau]
      ) {
        localTau++;
      }
      tau = localTau;
      break;
    }
  }
  if (tau === -1) {
    return null; // no periodic signal found (silence / noise)
  }

  // Step 5: parabolic interpolation around tau for sub-sample accuracy
  const x0 = tau > 0 ? tau - 1 : tau;
  const x2 = tau + 1 < halfLength ? tau + 1 : tau;
  let betterTau = tau;
  if (x0 !== tau && x2 !== tau) {
    const s0 = cmndf[x0];
    const s1 = cmndf[tau];
    const s2 = cmndf[x2];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) {
      betterTau = tau + (s2 - s0) / denom;
    }
  }

  const frequency = sampleRate / betterTau;
  const confidence = Math.max(0, Math.min(1, 1 - cmndf[tau]));

  if (!isFinite(frequency) || frequency <= 0) {
    return null;
  }

  return { frequency, confidence };
}
