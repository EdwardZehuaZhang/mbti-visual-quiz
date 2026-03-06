"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createInitialState } from "@/types/quiz";
import type { SceneResponse, ImageResult } from "@/types/quiz";

async function prefetchFirstRound(apiKey?: string) {
  try {
    const state = createInitialState();
    const sceneRes = await fetch("/api/scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, apiKey }),
    });
    const sceneData: SceneResponse = await sceneRes.json();
    const imagesData = await Promise.all(
      sceneData.imageQueries.map((q) =>
        fetch(`/api/images?q=${encodeURIComponent(q)}`).then(
          (r) => r.json() as Promise<ImageResult>
        )
      )
    );
    sessionStorage.setItem("prefetch-scene", JSON.stringify(sceneData));
    sessionStorage.setItem("prefetch-images", JSON.stringify(imagesData));
  } catch {}
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    sessionStorage.setItem("user-name", name.trim());
    if (apiKey.trim()) {
      sessionStorage.setItem("user-api-key", apiKey.trim());
    }

    // Start prefetch in background (non-blocking)
    prefetchFirstRound(apiKey.trim() || undefined);

    router.push("/quiz");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">
          Before we begin
        </h1>
        <p className="text-white/40 font-light text-sm mb-10">
          Tell us your name so we can share your results with the community.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-white/30 text-xs tracking-widest uppercase font-light">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              autoFocus
              className="bg-transparent border-0 border-b border-white/10 text-white font-light py-2 outline-none placeholder:text-white/20 focus:border-white/30 transition-colors duration-300 [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_transparent_inset] [&:-webkit-autofill]:[transition:background-color_9999s]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-white/30 text-xs tracking-widest uppercase font-light">
              OpenAI API key{" "}
              <span className="text-white/20 normal-case tracking-normal">
                (optional — uses shared key if blank)
              </span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="bg-transparent border-0 border-b border-white/10 text-white font-light py-2 outline-none placeholder:text-white/20 focus:border-white/30 transition-colors duration-300 font-mono text-sm [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_transparent_inset] [&:-webkit-autofill]:[transition:background-color_9999s]"
            />
          </div>

          <motion.button
            type="submit"
            disabled={!name.trim() || submitting}
            whileHover={{ opacity: 0.8 }}
            className="mt-4 border border-white/10 text-white/50 px-8 py-3 text-sm tracking-widest uppercase font-light hover:border-white/30 hover:text-white transition-all duration-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? "Starting..." : "Begin"}
          </motion.button>
        </form>
      </motion.div>
    </main>
  );
}
