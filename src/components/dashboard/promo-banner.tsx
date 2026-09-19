"use client";

import Image from "next/image";

export function PromoBanner() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[rgba(99,102,241,0.18)]">
      <div className="absolute inset-0">
        <Image src="/wpu-campus.jpg" alt="WPU campus" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05070F]/70 via-[#05070F]/35 to-transparent" />
      </div>
      <div className="relative flex min-h-[150px] items-center justify-end p-6 text-right">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-slate-200">WPU</p>
          <p className="font-display text-2xl italic leading-tight text-white">
            Your Voice
            <br />
            Builds a Brighter
            <br />
            WPU
          </p>
          <span className="mt-2 block h-1 w-24 bg-amber-300 rounded-full ml-auto" />
        </div>
      </div>
    </section>
  );
}
