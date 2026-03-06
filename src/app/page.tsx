"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createInitialState } from "@/types/quiz";
import type { SceneResponse, ImageResult } from "@/types/quiz";

async function prefetchFirstRound() {
  try {
    const state = createInitialState();
    const sceneRes = await fetch("/api/scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    const sceneData: SceneResponse = await sceneRes.json();
    const imagesData = await Promise.all(
      sceneData.imageQueries.map((q) =>
        fetch(`/api/images?q=${encodeURIComponent(q)}`).then((r) => r.json() as Promise<ImageResult>)
      )
    );
    sessionStorage.setItem("prefetch-scene", JSON.stringify(sceneData));
    sessionStorage.setItem("prefetch-images", JSON.stringify(imagesData));
  } catch {}
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Start fetching round 1 immediately in the background
    prefetchFirstRound();
  }, []);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden cursor-pointer"
      onClick={() => router.push("/quiz")}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 text-center max-w-2xl"
      >
        <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-8 leading-tight text-white">
          MBTI x Pinterest
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="text-lg md:text-xl text-white/60 font-light max-w-md mx-auto"
        >
          Choose images that speak to you, and we&apos;ll guess who you are. Touch to start.
        </motion.p>
      </motion.div>
    </main>
  );
}