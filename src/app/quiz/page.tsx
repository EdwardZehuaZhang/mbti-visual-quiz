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

    const pinIdParam = currentState.lastPinId
      ? `&pinId=${encodeURIComponent(currentState.lastPinId)}`
      : "";
    const imagesRes = await fetch(
      `/api/images?q=${encodeURIComponent(sceneData.imageQuery)}${pinIdParam}`
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

    // Instant visual feedback — no delay
    setSelectedId(image.id);
    setPhase("interpreting");

    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          scene: scene?.scene,
          chosenImage: { description: image.description, alt: image.alt },
        }),
      });

      if (!res.ok) throw new Error(`interpret ${res.status}`);

      const data: InterpretResponse = await res.json();

      // Guard against malformed response
      if (!data?.state?.confidence?.EI === undefined) throw new Error("bad response");

      const newState: PersonalityState = {
        ...data.state,
        lastPinId: image.id,
        selectedImages: [
          ...(state.selectedImages ?? []),
          { url: image.url, pinId: image.id },
        ],
      };
      setState(newState);

      if (isQuizComplete(newState)) {
        sessionStorage.setItem("mbti-state", JSON.stringify(newState));
        router.push("/results");
      } else {
        await new Promise((r) => setTimeout(r, 400));
        loadRound(newState);
      }
    } catch (err) {
      console.error("interpret failed, retrying round", err);
      // Retry the same round gracefully
      setPhase("choosing");
      setSelectedId(null);
    }
  };

  const progress = state.turn / 15;
  const avgConfidence = state.confidence
    ? (state.confidence.EI + state.confidence.SN + state.confidence.TF + state.confidence.JP) / 4
    : 0;

  return (
    <main className="h-[100dvh] w-screen overflow-hidden flex flex-col relative">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-white/5">
        <motion.div
          className="h-full bg-white/40"
          animate={{ width: `${Math.max(progress, avgConfidence) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Loading state */}
      {phase === "loading" && (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-white/40 text-sm tracking-widest uppercase font-light"
          >
            Composing scene...
          </motion.div>
        </div>
      )}

      {/* Image grid — fills entire remaining viewport */}
      <AnimatePresence mode="wait">
        {phase !== "loading" && images.length > 0 && (
          <motion.div
            key={`grid-${roundKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 grid grid-cols-2 min-h-0"
            style={{ gridTemplateRows: "1fr 1fr" }}
          >
            {images.map((image, i) => (
              <motion.button
                key={image.id}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: phase === "interpreting" && selectedId !== image.id ? 0.25 : 1,
                }}
                transition={{ duration: 0.15, delay: phase === "choosing" ? i * 0.06 : 0 }}
                onClick={() => handleChoice(image)}
                disabled={phase !== "choosing"}
                className={`relative overflow-hidden cursor-pointer
                  ${selectedId === image.id ? "ring-2 ring-white ring-inset" : ""}
                `}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                  loading={i < 2 ? "eager" : "lazy"}
                />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn counter — bottom center */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <span className="text-white/40 text-sm font-light tracking-widest">
          {state.turn + 1} / 15
        </span>
      </div>
    </main>
  );
}