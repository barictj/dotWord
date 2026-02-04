import { Clue } from "./types";

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

function vowelCount(word: string) {
  let c = 0;
  for (const ch of word) if (VOWELS.has(ch)) c++;
  return c;
}

function consonantCount(word: string) {
  return word.length - vowelCount(word);
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

export function satisfies(word: string, clue: Clue): boolean {
  switch (clue.type) {
    case "startsWith":
      return word.startsWith(clue.letter);

    case "endsWith":
      return word.endsWith(clue.letter);

    case "vowelCount":
      return vowelCount(word) === clue.count;

    case "consonantCount":
      return consonantCount(word) === clue.count;

    case "noRepeatLetters":
      return new Set(word.split("")).size === word.length;

    case "hasDoubleLetter":
      return hasDoubleLetter(word);

    case "letterAtPos": {
      const idx = clue.pos - 1; // 1-based -> 0-based
      if (idx < 0 || idx >= word.length) return false;
      return word[idx] === clue.letter;
    }

    case "contains":
      return word.includes(clue.letter);

    case "notContains":
      return !word.includes(clue.letter);

    case "containsExactly":
      return countLetter(word, clue.letter) === clue.count;

    case "alphaAfter":
      return word > clue.word;

    case "alphaBefore":
      return word < clue.word;

    case "sharedLettersAtLeast": {
      const A = new Set(word.split(""));
      const B = new Set(clue.word.split(""));
      let shared = 0;
      for (const ch of A) if (B.has(ch)) shared++;
      return shared >= clue.n;
    }

    case "notWord":
      return word !== clue.word;
  }
}

export function solve(words: string[], clues: Clue[]): string[] {
  return words.filter((w) => clues.every((c) => satisfies(w, c)));
}
