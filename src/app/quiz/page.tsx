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

function getOrientation(): string {
  if (typeof window === "undefined") return "portrait";
  return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
}

// Preload images into browser cache before showing them
function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        })
    )
  ).then(() => {});
}

async function fetchSceneOnly(state: PersonalityState, apiKey?: string): Promise<SceneResponse | null> {
  try {
    const res = await fetch("/api/scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, apiKey }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchImagesForScene(
  sceneData: SceneResponse,
  orientation: string
): Promise<ImageResult[]> {
  const results = await Promise.all(
    sceneData.imageQueries.map(async (q, i) => {
      try {
        const res = await fetch(`/api/images?q=${encodeURIComponent(q)}&orientation=${orientation}`);
        if (!res.ok) return null;
        const img = await res.json() as ImageResult;
        return { ...img, queryIndex: i };
      } catch {
        return null;
      }
    })
  );
  return results.filter((img): img is ImageResult => img !== null);
}

async function fetchRound(
  state: PersonalityState,
  apiKey?: string
): Promise<{ scene: SceneResponse; images: ImageResult[] } | null> {
  try {
    const orientation = getOrientation();
    const sceneData = await fetchSceneOnly(state, apiKey);
    if (!sceneData) return null;

    const imagesData = await fetchImagesForScene(sceneData, orientation);
    if (imagesData.length < 2) return null;

    await preloadImages(imagesData.map((img) => img.url));

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
  const [displayTurn, setDisplayTurn] = useState(0);

  // Queue of prefetched rounds (up to 3 ahead)
  const prefetchQueue = useRef<Promise<{ scene: SceneResponse; images: ImageResult[] } | null>[]>([]);
  const apiKeyRef = useRef<string | undefined>(undefined);

  const fillQueue = useCallback((currentState: PersonalityState) => {
    while (prefetchQueue.current.length < 3) {
      prefetchQueue.current.push(fetchRound(currentState, apiKeyRef.current));
    }
  }, []);

  const showRound = useCallback((sceneData: SceneResponse, imagesData: ImageResult[]) => {
    setScene(sceneData);
    setImages(imagesData);
    setRoundKey((k) => k + 1);
    setPhase("choosing");
  }, []);

  const loadRound = useCallback(async (currentState: PersonalityState) => {
    setPhase("loading");
    setSelectedId(null);

    // Use prefetched data if available
    if (prefetchQueue.current.length > 0) {
      const next = prefetchQueue.current.shift()!;
      const prefetched = await next;
      if (prefetched) {
        showRound(prefetched.scene, prefetched.images);
        fillQueue(currentState);
        return;
      }
    }

    // Fallback: fetch now
    const result = await fetchRound(currentState);
    if (result) {
      showRound(result.scene, result.images);
      fillQueue(currentState);
    }
  }, [showRound, fillQueue]);

  // On mount: read API key and try prefetched data from onboarding
  useEffect(() => {
    apiKeyRef.current = sessionStorage.getItem("user-api-key") ?? undefined;
    const prefetchedScene = sessionStorage.getItem("prefetch-scene");
    const prefetchedImages = sessionStorage.getItem("prefetch-images");
    if (prefetchedScene && prefetchedImages) {
      sessionStorage.removeItem("prefetch-scene");
      sessionStorage.removeItem("prefetch-images");
      const sceneData: SceneResponse = JSON.parse(prefetchedScene);
      const imagesData: ImageResult[] = JSON.parse(prefetchedImages);
      // Preload from cache (likely already cached)
      preloadImages(imagesData.map((img) => img.url)).then(() => {
        showRound(sceneData, imagesData);
        fillQueue(createInitialState());
      });
    } else {
      loadRound(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChoice = async (image: ImageResult) => {
    if (phase !== "choosing") return;

    setSelectedId(image.id);
    setPhase("interpreting");
    setDisplayTurn((t) => t + 1);

    // On the last round, skip the loading spinner — user will navigate to results
    const loadingTimer = state.turn < 10 ? setTimeout(() => setPhase("loading"), 450) : null;
    const orientation = getOrientation();

    // Fire next scene fetch immediately — runs in parallel with interpret
    const nextSceneFetch = fetchSceneOnly(state, apiKeyRef.current);

    try {
      const [interpretRes, nextSceneData] = await Promise.all([
        fetch("/api/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state,
            scene: scene?.scene,
            chosenImage: { description: image.description, alt: image.alt },
            axis: scene?.axis,
            chosenPole: scene?.queryPoles?.[image.queryIndex ?? -1],
            apiKey: apiKeyRef.current,
          }),
        }),
        nextSceneFetch,
      ]);

      if (!interpretRes.ok) throw new Error(`interpret ${interpretRes.status}`);
      const data: InterpretResponse = await interpretRes.json();
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
      if (loadingTimer) clearTimeout(loadingTimer);

      if (isQuizComplete(newState)) {
        sessionStorage.setItem("mbti-state", JSON.stringify(newState));
        router.push("/results");
        return;
      }

      if (nextSceneData) {
        // Scene already done (ran parallel with interpret) — fetch images then preload
        const imagesData = await fetchImagesForScene(nextSceneData, orientation);
        if (imagesData.length >= 2) {
          await preloadImages(imagesData.map((img) => img.url));
          prefetchQueue.current = prefetchQueue.current.slice(0, 1);
          fillQueue(newState);
          showRound(nextSceneData, imagesData);
          return;
        }
      }

      // Fallback: use prefetch queue (scene fetch failed or images too few)
      prefetchQueue.current = prefetchQueue.current.slice(0, 1);
      fillQueue(newState);
      loadRound(newState);
    } catch (err) {
      if (loadingTimer) clearTimeout(loadingTimer);
      console.error("interpret failed, retrying round", err);
      prefetchQueue.current = [];
      setPhase("choosing");
      setSelectedId(null);
    }
  };

  return (
    <main className="h-[100dvh] w-screen overflow-hidden flex flex-col relative">
      {/* Progress bar — advances immediately on click */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-white/5">
        <motion.div
          className="h-full bg-white/40"
          animate={{ width: `${(displayTurn / 11) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Loading state */}
      <AnimatePresence>
        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center z-10 bg-background"
          >
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image grid 閳?all 4 images preloaded before shown */}
      <AnimatePresence mode="wait">
        {phase !== "loading" && images.length > 0 && (
          <motion.div
            key={`grid-${roundKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex-1 grid grid-cols-2 min-h-0"
            style={{ gridTemplateRows: "1fr 1fr" }}
          >
            {images.map((image) => (
              <motion.button
                key={image.id}
                animate={{
                  opacity: phase === "interpreting" && selectedId !== image.id ? 0.2 : 1,
                }}
                transition={{ duration: 0.2 }}
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
                  loading="eager"
                />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn counter */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <span className="text-white/40 text-sm font-light tracking-widest">
          {state.turn + 1} / 11
        </span>
      </div>
    </main>
  );
}