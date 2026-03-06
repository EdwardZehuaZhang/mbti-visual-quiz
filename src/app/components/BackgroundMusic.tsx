"use client";

import { useEffect, useRef } from "react";

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio("/background_music.mp3");
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    // Try autoplay immediately
    audio.play().catch(() => {
      // Blocked by browser — play on first interaction instead
      const unlock = () => {
        audio.play().catch(() => {});
        window.removeEventListener("click", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("touchstart", unlock);
      };
      window.addEventListener("click", unlock);
      window.addEventListener("keydown", unlock);
      window.addEventListener("touchstart", unlock);
    });

    return () => {
      audio.pause();
    };
  }, []);

  return null;
}
