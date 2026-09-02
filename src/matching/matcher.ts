import type { Theme } from "./database";

export interface MatchResult {
  theme: Theme;
  score: number; // 0..1, higher is a better match
}

/** Levenshtein edit distance between two interval arrays. */
function editDistance(a: number[], b: number[]): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(0),
  );
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[rows - 1][cols - 1];
}

/**
 * Scores how well a hummed/played interval sequence matches a theme's
 * interval sequence. Slides a window across the (usually longer) theme so a
 * query that starts partway through a theme can still match, and reports the
 * best-scoring alignment.
 */
function bestAlignmentScore(query: number[], theme: number[]): number {
  if (query.length === 0 || theme.length === 0) return 0;

  if (theme.length <= query.length) {
    const distance = editDistance(query, theme);
    const maxLen = Math.max(query.length, theme.length);
    return 1 - distance / maxLen;
  }

  let bestDistance = Infinity;
  for (let start = 0; start <= theme.length - query.length; start++) {
    const window = theme.slice(start, start + query.length);
    const distance = editDistance(query, window);
    if (distance < bestDistance) bestDistance = distance;
  }
  return 1 - bestDistance / query.length;
}

export function matchMelody(
  queryIntervals: number[],
  themes: Theme[],
  topN = 5,
): MatchResult[] {
  return themes
    .map((theme) => ({
      theme,
      score: bestAlignmentScore(queryIntervals, theme.intervals),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
