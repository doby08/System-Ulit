"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    title: "AI Interview & Survey System",
    text: "This system helps WPU collect meaningful feedback from students, faculty, staff, and the community through AI-generated interviews and surveys.",
  },
  {
    title: "AI-Powered Question Generation",
    text: "Generate up to 50 structured, semi-structured, or unstructured questions per survey — tuned by stakeholder, language, and interview mode.",
  },
  {
    title: "Smart Survey Analytics",
    text: "Track Likert scores, satisfaction, completion, sentiment, keywords, and response trends in real time.",
  },
  {
    title: "QR & Offline Interview",
    text: "Publish surveys with QR codes. Respondents can answer offline and sync automatically when reconnected.",
  },
  {
    title: "AI-Generated Insights",
    text: "Summaries, themes, pain points, and suggestions are generated from open-ended responses to guide action.",
  },
];

export function SystemInfoCarousel() {
  const [index, setIndex] = useState(0);
  const prev = useCallback(() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length), []);
  const next = useCallback(() => setIndex((i) => (i + 1) % SLIDES.length), []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(next, 8000);
    return () => clearInterval(t);
  }, [next]);

  const slide = SLIDES[index];

  return (
    <section className="rounded-3xl border border-[rgba(99,102,241,0.18)] bg-[#0A1030]/70 p-5 backdrop-blur">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white">
          <Info className="h-4 w-4" />
        </span>
        About This System
      </h2>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={prev} aria-label="Previous slide" className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="relative min-h-[150px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div key={index} className="animate-in-fade grid gap-4 p-4 sm:grid-cols-[220px_1fr]">
            <div className="relative h-32 overflow-hidden rounded-xl sm:h-full sm:min-h-[132px]">
              <Image src="/wpu-campus.jpg" alt="WPU Main Campus" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#05070F]/80 to-transparent" />
            </div>
            <div className="min-w-0 py-1">
              <p className="text-sm font-semibold text-white">{slide.title}</p>
              <p className="mt-2 text-xs leading-5 text-slate-300">{slide.text}</p>
              <div className="mt-4 flex items-center justify-center gap-1.5 sm:justify-start">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-[#5C88FB]" : "w-1.5 bg-white/20 hover:bg-white/40")}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <button onClick={next} aria-label="Next slide" className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex sm:hidden items-center justify-between">
        <button onClick={prev} aria-label="Previous slide" className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200">Previous</button>
        <button onClick={next} aria-label="Next slide" className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200">Next</button>
      </div>
    </section>
  );
}
