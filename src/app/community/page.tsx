"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

interface CommunityResult {
  id: string;
  name: string;
  mbti_type: string;
  paragraph: string;
  selected_images: Array<{ url: string; pinId: string }>;
  created_at: string;
}

export default function CommunityPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [results, setResults] = useState<CommunityResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/community", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setResults(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pathname]);

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-white">
              Community
            </h1>
            <p className="text-white/30 text-sm font-light mt-1">
              Everyone&apos;s aesthetic personality
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-white/30 text-sm font-light hover:text-white/60 transition-colors duration-300 tracking-widest uppercase"
          >
            Back
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-24 text-white/30 font-light">
            No results yet. Be the first!
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((result, i) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="bg-white/[0.03] border border-white/5 overflow-hidden"
              >
                {/* Header */}
                <div className="px-3 pt-3 pb-2">
                  <p className="text-white/30 text-xs font-light truncate">
                    {result.name}
                  </p>
                  <p className="text-white text-2xl font-extralight tracking-[0.15em]">
                    {result.mbti_type}
                  </p>
                </div>

                {/* Image grid */}
                {result.selected_images?.length > 0 && (
                  <div className="grid grid-cols-4">
                    {result.selected_images.slice(0, 8).map((img, j) => (
                      <div
                        key={j}
                        className="aspect-square overflow-hidden"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
