"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

// Prefetch next scene + images while user is deciding
async function prefetchNextRound(state: PersonalityState): Promise<{ scene: SceneResponse; images: ImageResult[] } | null> {
  try {
    const sceneRes = await fetch("/api/scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    if (!sceneRes.ok) return null;
    const sceneData: SceneResponse = await sceneRes.json();
    const imagesRes = await fetch(`/api/images?q=${encodeURIComponent(sceneData.imageQuery)}`);
    if (!imagesRes.ok) return null;
    const imagesData: ImageResult[] = await imagesRes.json();
    return { scene: sceneData, images: imagesData };
  } catch {
    return null;
  }
}

export default function QuizPage() {
  const router = useRouter();
  const [state, setState] = useState<PersonalityState>(createInitialState);
  const [scene, setScene] = useState<SceneResponse | null>(null);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [roundKey, setRoundKey] = useState(0);

  // Holds prefetched next round data
  const prefetchRef = useRef<Promise<{ scene: SceneResponse; images: ImageResult[] } | null> | null>(null);

  const showRound = useCallback((sceneData: SceneResponse, imagesData: ImageResult[]) => {
    setScene(sceneData);
    setImages(imagesData);
    setRoundKey((k) => k + 1);
    setPhase("choosing");
  }, []);

  const loadRound = useCallback(async (currentState: PersonalityState) => {
    setPhase("loading");
    setSelectedId(null);

    // Check for prefetched data first
    if (prefetchRef.current) {
      const prefetched = await prefetchRef.current;
      prefetchRef.current = null;
      if (prefetched) {
        showRound(prefetched.scene, prefetched.images);
        return;
      }
    }

    // No prefetch available — fetch now
    try {
      const pinIdParam = currentState.lastPinId
        ? `&pinId=${encodeURIComponent(currentState.lastPinId)}`
        : "";
      const [sceneRes, ] = await Promise.all([
        fetch("/api/scene", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: currentState }),
        }),
      ]);
      const sceneData: SceneResponse = await sceneRes.json();
      const imagesRes = await fetch(`/api/images?q=${encodeURIComponent(sceneData.imageQuery)}${pinIdParam}`);
      const imagesData: ImageResult[] = await imagesRes.json();
      showRound(sceneData, imagesData);
    } catch {
      setPhase("loading");
    }
  }, [showRound]);

  // On mount: try to use data prefetched from landing page
  useEffect(() => {
    const prefetchedScene = sessionStorage.getItem("prefetch-scene");
    const prefetchedImages = sessionStorage.getItem("prefetch-images");
    if (prefetchedScene && prefetchedImages) {
      sessionStorage.removeItem("prefetch-scene");
      sessionStorage.removeItem("prefetch-images");
      const sceneData: SceneResponse = JSON.parse(prefetchedScene);
      const imagesData: ImageResult[] = JSON.parse(prefetchedImages);
      showRound(sceneData, imagesData);
    } else {
      loadRound(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChoice = async (image: ImageResult) => {
    if (phase !== "choosing") return;

    // Instant visual feedback
    setSelectedId(image.id);
    setPhase("interpreting");

    try {
      // Fire interpret + prefetch next round in parallel
      const interpretPromise = fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          scene: scene?.scene,
          chosenImage: { description: image.description, alt: image.alt },
        }),
      });

      // Start prefetching next scene immediately using current state (approximate but fast)
      prefetchRef.current = prefetchNextRound(state);

      const res = await interpretPromise;
      if (!res.ok) throw new Error(`interpret ${res.status}`);

      const data: InterpretResponse = await res.json();
      if (!data?.state?.confidence) throw new Error("bad response");

      const newState: PersonalityState = {
        ...data.state,
        lastPinId: image.id,
        selectedImages: [
          ...(state.selectedImages ?? []),
          { url: image.url, pinId: image.id },
        ],
      };
      setState(newState);

      // Replace prefetch with one based on actual updated state for better accuracy
      prefetchRef.current = prefetchNextRound(newState);

      if (isQuizComplete(newState)) {
        sessionStorage.setItem("mbti-state", JSON.stringify(newState));
        router.push("/results");
      } else {
        await new Promise((r) => setTimeout(r, 300));
        loadRound(newState);
      }
    } catch (err) {
      console.error("interpret failed, retrying round", err);
      prefetchRef.current = null;
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

      {/* Image grid */}
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

      {/* Turn counter */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <span className="text-white/40 text-sm font-light tracking-widest">
          {state.turn + 1} / 15
        </span>
      </div>
    </main>
  );
}