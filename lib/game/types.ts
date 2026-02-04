export type Clue =
  | { type: "startsWith"; letter: string }
  | { type: "endsWith"; letter: string }
  | { type: "vowelCount"; count: number }
  | { type: "consonantCount"; count: number } // NEW
  | { type: "noRepeatLetters" }
  | { type: "hasDoubleLetter" } // NEW
  | { type: "letterAtPos"; pos: number; letter: string } // NEW (1-based)
  | { type: "contains"; letter: string }
  | { type: "notContains"; letter: string }
  | { type: "containsExactly"; letter: string; count: number } // NEW
  | { type: "alphaAfter"; word: string }
  | { type: "alphaBefore"; word: string }
  | { type: "sharedLettersAtLeast"; word: string; n: number }
  | { type: "notWord"; word: string };
