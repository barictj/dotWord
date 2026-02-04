import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Share } from "react-native";
import * as Clipboard from "expo-clipboard";

import { initDb, getPuzzle, savePuzzle, getPlay, savePlay } from "../lib/db";
import { todayUTC } from "../lib/time";
import { generatePuzzle } from "../lib/game/generator";
import type { Clue } from "../lib/game/types";

const words = require("../assets/words.json") as string[];

const BG = "#0B0F17";
const FG = "#FFFFFF";
const BORDER = "rgba(255,255,255,0.14)";

type PlayRow = { solved: number; timeMs: number; hints: number };

function clueText(c: Clue) {
  switch (c.type) {
    case "startsWith":
      return `Starts with ${c.letter}`;
    case "endsWith":
      return `Ends with ${c.letter}`;
    case "vowelCount":
      return `Has exactly ${c.count} vowels`;
    case "consonantCount":
      return `Has exactly ${c.count} consonants`;
    case "noRepeatLetters":
      return `Has no repeated letters`;
    case "hasDoubleLetter":
      return `Has a double letter`;
    case "letterAtPos":
      return `Letter ${c.pos} is ${c.letter}`;
    case "contains":
      return `Contains the letter ${c.letter}`;
    case "notContains":
      return `Does NOT contain the letter ${c.letter}`;
    case "containsExactly":
      return `Contains ${c.letter} exactly ${c.count} time${c.count === 1 ? "" : "s"}`;
    case "alphaAfter":
      return `Alphabetically after ${c.word}`;
    case "alphaBefore":
      return `Alphabetically before ${c.word}`;
    case "sharedLettersAtLeast":
      return `Shares at least ${c.n} letters with ${c.word}`;
    case "notWord":
      return `Is NOT ${c.word}`;
    default:
      return "Clue";
  }
}

/** 🟩⬜⬜⬜⬜ based on time */
function timeBars(solved: boolean, seconds: number) {
  if (!solved) return "🟥🟥🟥🟥🟥";

  if (seconds < 10) return "🟩🟩🟩🟩🟩";
  if (seconds < 20) return "🟩🟩🟩🟩⬜";
  if (seconds < 30) return "🟩🟩🟩⬜⬜";
  if (seconds < 45) return "🟩🟩⬜⬜⬜";
  return "🟩⬜⬜⬜⬜";
}

function shareText(date: string, solved: boolean, seconds: number) {
  return `dotWord ${date} ${solved ? "✅" : "❌"} ${seconds}s\n${timeBars(
    solved,
    seconds,
  )}`;
}

export default function Home() {
  const [puzzle, setPuzzle] = useState<any>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [ms, setMs] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [play, setPlay] = useState<PlayRow | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // timer
  useEffect(() => {
    const t0 = Date.now();
    timerRef.current = setInterval(() => setMs(Date.now() - t0), 200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // load puzzle + play
  useEffect(() => {
    try {
      initDb();
      const d = todayUTC();
      setDate(d);

      const seed = `v1-${d}`;
      let p = getPuzzle(d);
      if (!p) {
        p = generatePuzzle(seed, words);
        savePuzzle(d, p);
      }
      setPuzzle(p);

      const existing = getPlay(d) ?? null;
      setPlay(existing);

      if (existing && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setMs(existing.timeMs);
      }
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }, []);

  const seconds = Math.floor(ms / 1000);
  const done = picked !== null || play !== null;
  const solved =
    picked !== null ? picked === puzzle?.answer : play?.solved === 1;

  if (err) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: BG,
          justifyContent: "center",
          padding: 16,
        }}
      >
        <Text style={{ color: FG, fontWeight: "900" }}>Crash</Text>
        <Text style={{ color: FG, opacity: 0.8 }}>{err}</Text>
      </View>
    );
  }

  if (!puzzle) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: BG,
          justifyContent: "center",
          padding: 16,
        }}
      >
        <Text style={{ color: FG, fontWeight: "900", fontSize: 22 }}>
          dotWord
        </Text>
        <Text style={{ color: FG, opacity: 0.7 }}>Loading…</Text>
      </View>
    );
  }

  async function onShare() {
    const txt = shareText(date, solved, seconds);
    try {
      await Share.share({ message: txt });
    } catch {
      await Clipboard.setStringAsync(txt);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
    >
      <Text style={{ color: FG, fontSize: 28, fontWeight: "900" }}>
        dotWord
      </Text>
      <Text style={{ color: FG, opacity: 0.7 }}>Today • {seconds}s</Text>

      <View
        style={{
          borderWidth: 1,
          borderColor: BORDER,
          borderRadius: 14,
          padding: 14,
        }}
      >
        <Text style={{ color: FG, fontWeight: "800" }}>Clues</Text>
        {puzzle.clues.map((c: Clue, i: number) => (
          <Text key={i} style={{ color: FG, opacity: 0.9 }}>
            • {clueText(c)}
          </Text>
        ))}
      </View>

      <View>
        {puzzle.picks.map((w: string) => (
          <Pressable
            key={w}
            disabled={done}
            onPress={() => {
              timerRef.current && clearInterval(timerRef.current);
              setPicked(w);
              const solvedNow = w === puzzle.answer ? 1 : 0;
              savePlay(date, solvedNow, ms, 0);
              setPlay({ solved: solvedNow, timeMs: ms, hints: 0 });
            }}
            style={{
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: BORDER,
              marginTop: 10,
              opacity: done && picked !== w ? 0.5 : 1,
            }}
          >
            <Text style={{ color: FG, fontWeight: "800", fontSize: 18 }}>
              {w}
            </Text>
          </Pressable>
        ))}
      </View>

      {done && (
        <View
          style={{
            borderWidth: 1,
            borderColor: BORDER,
            borderRadius: 14,
            padding: 14,
            gap: 10,
          }}
        >
          <Text style={{ color: FG, fontWeight: "900", fontSize: 18 }}>
            {solved ? "✅ Correct!" : "❌ Nope"}
          </Text>
          {!solved && (
            <Text style={{ color: FG }}>Answer: {puzzle.answer}</Text>
          )}
          <Text style={{ color: FG }}>Time: {seconds}s</Text>
          <Text>{timeBars(solved, seconds)}</Text>

          <Pressable
            onPress={onShare}
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: BORDER,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: FG, fontWeight: "800", textAlign: "center" }}>
              Share
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
