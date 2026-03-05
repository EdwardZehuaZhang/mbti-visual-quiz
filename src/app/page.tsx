"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 text-center max-w-2xl"
      >
        <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-8 leading-tight">
          Discover your type
          <br />
          <span className="text-accent">through what you</span>
          <br />
          love to look at.
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="text-lg md:text-xl text-foreground/50 font-light mb-16 max-w-md mx-auto"
        >
          A visual personality test powered by AI. Choose images that speak to
          you, and we&apos;ll reveal who you are.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <Link
            href="/quiz"
            className="inline-block border border-accent/40 text-accent px-10 py-4 text-lg font-light tracking-widest uppercase hover:bg-accent hover:text-background transition-all duration-500"
          >
            Begin
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.03 }}
        transition={{ delay: 1.5, duration: 2 }}
        className="absolute bottom-8 text-sm tracking-widest uppercase font-light"
      >
        MBTI Visual Assessment
      </motion.div>
    </main>
  );
}
