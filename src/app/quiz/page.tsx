"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type {
  PersonalityState,
  SceneResponse,
  ImageResult,
  InterpretResponse,
} from "@/types/quiz";
import { createInitialState, isQuizComplete } from "@/types/quiz";

type Phase = "loading" | "choosing" | "interpreting";

export default function QuizPage() {
  const router = useRouter();
  const [state, setState] = useState<PersonalityState>(createInitialState);
  const [scene, setScene] = useState<SceneResponse | null>(null);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [roundKey, setRoundKey] = useState(0);

  const loadRound = useCallback(async (currentState: PersonalityState) => {
    setPhase("loading");
    setSelectedId(null);

    const sceneRes = await fetch("/api/scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: currentState }),
    });
    const sceneData: SceneResponse = await sceneRes.json();
    setScene(sceneData);

    const imagesRes = await fetch(
      `/api/images?q=${encodeURIComponent(sceneData.imageQuery)}`
    );
    const imagesData: ImageResult[] = await imagesRes.json();
    setImages(imagesData);

    setRoundKey((k) => k + 1);
    setPhase("choosing");
  }, []);

  useEffect(() => {
    loadRound(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChoice = async (image: ImageResult) => {
    if (phase !== "choosing") return;
    setSelectedId(image.id);
    setPhase("interpreting");

    const res = await fetch("/api/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state,
        scene: scene?.scene,
        chosenImage: { description: image.description, alt: image.alt },
      }),
    });
    const data: InterpretResponse = await res.json();
    const newState = data.state;
    setState(newState);

    if (isQuizComplete(newState)) {
      sessionStorage.setItem("mbti-state", JSON.stringify(newState));
      router.push("/results");
    } else {
      await new Promise((r) => setTimeout(r, 600));
      loadRound(newState);
    }
  };

  const progress = state.turn / 15;
  const avgConfidence =
    (state.confidence.EI +
      state.confidence.SN +
      state.confidence.TF +
      state.confidence.JP) /
    4;

  return (
    <main className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-foreground/5">
        <motion.div
          className="h-full bg-accent/60"
          animate={{ width: `${Math.max(progress, avgConfidence) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Turn counter */}
      <div className="fixed top-6 right-6 z-50 text-foreground/20 text-sm font-light tracking-widest">
        {state.turn + 1} / 15
      </div>

      {/* Scene description */}
      <AnimatePresence mode="wait">
        {scene && phase !== "loading" && (
          <motion.div
            key={`scene-${roundKey}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
            className="pt-16 pb-8 px-6 text-center"
          >
            <p className="text-foreground/40 text-lg md:text-xl font-light max-w-2xl mx-auto italic leading-relaxed">
              {scene.scene}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {phase === "loading" && (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-accent/60 text-sm tracking-widest uppercase font-light"
          >
            Composing scene...
          </motion.div>
        </div>
      )}

      {/* Image grid */}
      <AnimatePresence mode="wait">
        {phase !== "loading" && images.length > 0 && (
          <motion.div
            key={`grid-${roundKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex items-center justify-center px-4 pb-8"
          >
            <div className="grid grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl aspect-square">
              {images.map((image, i) => (
                <motion.button
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  onClick={() => handleChoice(image)}
                  disabled={phase !== "choosing"}
                  className={`relative overflow-hidden rounded-sm group cursor-pointer transition-all duration-300
                    ${selectedId === image.id ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}
                    ${phase === "interpreting" && selectedId !== image.id ? "opacity-30" : ""}
                  `}
                >
                  <div className="absolute inset-0 bg-foreground/5 group-hover:bg-transparent transition-colors duration-300 z-10" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading={i < 2 ? "eager" : "lazy"}
                  />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interpreting overlay */}
      <AnimatePresence>
        {phase === "interpreting" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-8 left-0 right-0 text-center"
          >
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-accent/50 text-sm tracking-widest uppercase font-light"
            >
              Reading your choice...
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
