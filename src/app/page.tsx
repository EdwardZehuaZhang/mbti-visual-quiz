"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 text-center max-w-2xl"
      >
        <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-8 leading-tight text-white">
          MBTI x Pexels
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="text-lg md:text-xl text-white/60 font-light max-w-md mx-auto mb-12"
        >
          Choose images that speak to you, and we&apos;ll guess who you are.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="flex gap-4 justify-center flex-wrap"
        >
          <Link
            href="/community"
            className="border border-white/10 text-white/30 px-8 py-3 text-sm tracking-widest uppercase font-light hover:border-white/40 hover:text-white transition-all duration-500"
          >
            Community
          </Link>
          <button
            onClick={() => router.push("/onboarding")}
            className="border border-white/20 text-white/70 px-8 py-3 text-sm tracking-widest uppercase font-light hover:border-white/60 hover:text-white transition-all duration-500"
          >
            Start Quiz
          </button>
        </motion.div>
      </motion.div>
    </main>
  );
}