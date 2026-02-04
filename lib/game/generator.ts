// dotWord/lib/game/generator.ts
import seedrandom from "seedrandom";
import { Clue } from "./types";
import { solve } from "./solver";

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

function vowelCount(word: string) {
  let c = 0;
  for (const ch of word) if (VOWELS.has(ch)) c++;
  return c;
}

function consonantCount(word: string) {
  return word.length - vowelCount(word);
}

function sharedLettersCount(a: string, b: string) {
  const A = new Set(a.split(""));
  const B = new Set(b.split(""));
  let c = 0;
  for (const ch of A) if (B.has(ch)) c++;
  return c;
}

function hasDoubleLetter(word: string) {
  for (let i = 1; i < word.length; i++) {
    if (word[i] === word[i - 1]) return true;
  }
  return false;
}

function countLetter(word: string, letter: string) {
  let c = 0;
  for (const ch of word) if (ch === letter) c++;
  return c;
}

function pickDistinct5(rng: seedrandom.PRNG, words: string[]) {
  const pool = [...words].map((w) => w.toUpperCase());

  // Fisher–Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const picks: string[] = [];
  const seen = new Set<string>();
  for (const w of pool) {
    if (!w) continue;
    if (seen.has(w)) continue;
    if (w.length < 4) continue; // keep it sane
    seen.add(w);
    picks.push(w);
    if (picks.length === 5) break;
  }
  return picks;
}

function buildCandidateClues(
  answer: string,
  picks: string[],
  rng: seedrandom.PRNG,
): Clue[] {
  const others = picks.filter((w) => w !== answer);
  const candidates: Clue[] = [];

  // Core / reliable
  candidates.push({ type: "startsWith", letter: answer[0] });
  candidates.push({ type: "endsWith", letter: answer[answer.length - 1] });
  candidates.push({ type: "vowelCount", count: vowelCount(answer) });
  candidates.push({ type: "consonantCount", count: consonantCount(answer) });
  candidates.push({ type: "noRepeatLetters" }); // filtered later to be true for answer

  // Contains / notContains (we'll filter to true-for-answer later)
  candidates.push({
    type: "contains",
    letter: answer[Math.floor(rng() * answer.length)],
  });
  candidates.push({
    type: "notContains",
    letter: answer[Math.floor(rng() * answer.length)],
  });

  // NEW: letterAtPos (1-based)
  {
    const pos = Math.floor(rng() * answer.length) + 1;
    candidates.push({ type: "letterAtPos", pos, letter: answer[pos - 1] });
  }

  // NEW: hasDoubleLetter (only if true)
  if (hasDoubleLetter(answer)) {
    candidates.push({ type: "hasDoubleLetter" });
  }

  // NEW: containsExactly(letter, n)
  {
    const letters = Array.from(new Set(answer.split("")));
    const L = letters[Math.floor(rng() * letters.length)];
    const cnt = countLetter(answer, L);
    candidates.push({ type: "containsExactly", letter: L, count: cnt });
  }

  // Alpha constraints relative to another pick
  if (others.length) {
    const ref = others[Math.floor(rng() * others.length)];
    candidates.push({ type: "alphaAfter", word: ref });
    candidates.push({ type: "alphaBefore", word: ref });

    const ref2 = others[Math.floor(rng() * others.length)];
    const shared = sharedLettersCount(answer, ref2);
    const n = Math.max(1, Math.min(shared, 4));
    candidates.push({ type: "sharedLettersAtLeast", word: ref2, n });

    // Not equal to some other word (tie-breaker)
    const notW = others[Math.floor(rng() * others.length)];
    candidates.push({ type: "notWord", word: notW });
  }

  // Keep ONLY clues that are true for the answer
  const trueForAnswer = candidates.filter(
    (c) => solve([answer], [c]).length === 1,
  );

  // Shuffle (seeded)
  for (let i = trueForAnswer.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [trueForAnswer[i], trueForAnswer[j]] = [trueForAnswer[j], trueForAnswer[i]];
  }

  return trueForAnswer;
}

export function generatePuzzle(seed: string, words: string[]) {
  const rng = seedrandom(seed);

  const OUTER_TRIES = 200; // re-pick word sets
  const INNER_TRIES = 500; // clue attempts

  for (let attempt = 0; attempt < OUTER_TRIES; attempt++) {
    const picks = pickDistinct5(rng, words);
    if (picks.length < 5) continue;

    const answer = picks[Math.floor(rng() * 5)];

    const cluePool = buildCandidateClues(answer, picks, rng);

    let clues: Clue[] = [];
    let usedTypes = new Set<string>();
    let current = picks;

    for (let step = 0; step < INNER_TRIES && clues.length < 5; step++) {
      if (!cluePool.length) break;

      const clue = cluePool[Math.floor(rng() * cluePool.length)];

      // no duplicate clue types
      if (usedTypes.has(clue.type)) continue;

      const next = solve(picks, [...clues, clue]);

      // must keep answer AND must reduce candidates
      if (!next.includes(answer)) continue;
      if (next.length >= current.length) continue;

      clues = [...clues, clue];
      usedTypes.add(clue.type);
      current = next;
    }

    if (clues.length !== 5) continue;

    const result = solve(picks, clues);
    if (result.length === 1 && result[0] === answer) {
      return { picks, answer, clues };
    }
  }

  // Fallback (never crash app)
  const fallbackPicks = words.slice(0, 5).map((w) => w.toUpperCase());
  const fallbackAnswer = fallbackPicks[0] ?? "ERROR";
  const fallbackClues: Clue[] = [
    { type: "startsWith", letter: fallbackAnswer[0] },
    { type: "endsWith", letter: fallbackAnswer[fallbackAnswer.length - 1] },
    { type: "vowelCount", count: vowelCount(fallbackAnswer) },
    { type: "consonantCount", count: consonantCount(fallbackAnswer) },
    { type: "letterAtPos", pos: 1, letter: fallbackAnswer[0] },
  ];
  return { picks: fallbackPicks, answer: fallbackAnswer, clues: fallbackClues };
}
