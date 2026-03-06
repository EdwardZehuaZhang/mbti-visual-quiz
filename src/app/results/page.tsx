"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { PersonalityState, ResultsResponse } from "@/types/quiz";

const AXIS_LABELS: Record<string, [string, string]> = {
  EI: ["Introversion", "Extraversion"],
  SN: ["Sensing", "Intuition"],
  TF: ["Thinking", "Feeling"],
  JP: ["Judging", "Perceiving"],
};

function TraitBar({
  axis,
  score,
  delay,
}: {
  axis: string;
  score: number;
  delay: number;
}) {
  const [left, right] = AXIS_LABELS[axis] || ["", ""];
  const pct = ((score + 1) / 2) * 100;
  const dominant = score < 0 ? left : right;
  const strength = Math.round(Math.abs(score) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.6 }}
      className="mb-6"
    >
      <div className="flex justify-between mb-2 text-sm font-light tracking-wide">
        <span className={score < 0 ? "text-white" : "text-white/40"}>
          {left}
        </span>
        <span className="text-white/20 text-xs">
          {dominant} {strength}%
        </span>
        <span className={score > 0 ? "text-white" : "text-white/40"}>
          {right}
        </span>
      </div>
      <div className="h-[2px] bg-foreground/10 relative rounded-full overflow-hidden">
        <motion.div
          initial={{ width: "50%" }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay + 0.3, duration: 0.8, ease: "easeOut" }}
          className="h-full bg-white/70 absolute left-0"
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-foreground/20 rounded-full" />
      </div>
    </motion.div>
  );
}

export default function ResultsPage() {
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<PersonalityState | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("mbti-state");
    if (!stored) return;

    const parsedState: PersonalityState = JSON.parse(stored);
    setState(parsedState);

    // Use cached results if available
    const cached = sessionStorage.getItem("mbti-results");
    if (cached) {
      setResults(JSON.parse(cached));
      setLoading(false);
      return;
    }

    const apiKey = sessionStorage.getItem("user-api-key") ?? undefined;

    fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: parsedState, apiKey }),
    })
      .then((r) => r.json())
      .then((data: ResultsResponse) => {
        sessionStorage.setItem("mbti-results", JSON.stringify(data));
        setResults(data);
        setLoading(false);

        const name = sessionStorage.getItem("user-name");
        if (name) {
          fetch("/api/community/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              mbtiType: data.type,
              paragraph: data.paragraph,
              traitBreakdown: data.traitBreakdown,
              selectedImages: parsedState.selectedImages,
            }),
          }).catch((err) => console.error("Community save failed:", err));
        }
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white/60 text-sm tracking-widest uppercase font-light"
        >
          Guessing your MBTI...
        </motion.div>
      </main>
    );
  }

  if (!results || !state) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6">
        <p className="text-foreground/40 font-light">No results found.</p>
        <Link href="/" className="text-white underline underline-offset-4">
          Start over
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-20 max-w-2xl mx-auto">
      {/* Type card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-16"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-foreground/20 text-sm tracking-[0.3em] uppercase font-light mb-4"
        >
          Your type is
        </motion.div>
        <h1 className="text-8xl md:text-9xl font-extralight tracking-[0.2em] text-white">
          {results.type}
        </h1>
      </motion.div>

      {/* Trait bars */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mb-16"
      >
        {(["EI", "SN", "TF", "JP"] as const).map((axis, i) => (
          <TraitBar
            key={axis}
            axis={axis}
            score={results.traitBreakdown?.[axis]?.score ?? 0}
            delay={0.8 + i * 0.15}
          />
        ))}
      </motion.div>

      {/* Personalised paragraph */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="mb-20"
      >
        <p className="text-foreground/70 font-light leading-relaxed text-lg">
          {results.paragraph ?? ""}
        </p>
      </motion.div>

      {/* Aesthetic journey collage */}
      {state.selectedImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="mb-16"
        >
          <h2 className="text-white/20 text-sm tracking-[0.2em] uppercase font-light mb-6 text-center">
            Your Aesthetic Journey
          </h2>
          <div className="grid grid-cols-4 md:grid-cols-5">
            {state.selectedImages.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2 + i * 0.08, duration: 0.4 }}
                className="aspect-square overflow-hidden group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`Choice ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Restart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 0.5 }}
        className="text-center"
      >
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/"
            className="inline-block border border-white/10 text-white/30 px-8 py-3 text-sm tracking-widest uppercase font-light hover:border-white/40 hover:text-white transition-all duration-500"
          >
            Take again
          </Link>
          <Link
            href="/community"
            className="inline-block border border-white/10 text-white/30 px-8 py-3 text-sm tracking-widest uppercase font-light hover:border-white/40 hover:text-white transition-all duration-500"
          >
            Community
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
