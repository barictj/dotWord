// dotWord/lib/db.ts
import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("dotword.db");

export function initDb() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS puzzles (
      date TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plays (
      date TEXT PRIMARY KEY NOT NULL,
      solved INTEGER NOT NULL DEFAULT 0,
      timeMs INTEGER NOT NULL DEFAULT 0,
      hints INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export function getPuzzle(date: string) {
  const row = db.getFirstSync<{ data: string }>(
    "SELECT data FROM puzzles WHERE date = ?",
    [date],
  );
  return row ? JSON.parse(row.data) : null;
}

export function savePuzzle(date: string, puzzle: any) {
  db.runSync("INSERT OR REPLACE INTO puzzles(date, data) VALUES(?, ?)", [
    date,
    JSON.stringify(puzzle),
  ]);
}
export function savePlay(
  date: string,
  solved: number,
  timeMs: number,
  hints: number,
) {
  db.runSync(
    "INSERT OR REPLACE INTO plays(date, solved, timeMs, hints) VALUES(?, ?, ?, ?)",
    [date, solved, timeMs, hints],
  );
}

export function getPlay(date: string) {
  return db.getFirstSync<{ solved: number; timeMs: number; hints: number }>(
    "SELECT solved, timeMs, hints FROM plays WHERE date = ?",
    [date],
  );
}
