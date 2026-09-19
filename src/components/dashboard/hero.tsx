"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function DashboardHero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-3xl border border-[rgba(99,102,241,0.22)]"
    >
      <div className="absolute inset-0">
        <Image
          src="/wpu-campus.jpg"
          alt="Western Philippines University Main Campus, Aborlan, Palawan"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05070F]/95 via-[#05070F]/70 to-[#05070F]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070F]/90 via-transparent to-[#05070F]/30" />
      </div>
      <div className="relative px-6 py-8 sm:px-10 sm:py-12 max-w-2xl">
        <p className="text-sm text-slate-300">Welcome to</p>
        <h1 className="mt-1 font-display text-3xl sm:text-[42px] leading-[1.05] font-extrabold text-white">
          AI Interview &amp; Survey System
        </h1>
        <p className="mt-2 text-[15px] font-semibold text-[#7FB3FF]">
          Empowering Voices, Building a Better WPU
        </p>
        <p className="mt-3 max-w-xl text-[13px] leading-6 text-slate-300">
          Create intelligent interviews and surveys, collect real insights, and help
          shape a brighter future for the WPU community.
        </p>
        <Link
          href="/admin/surveys/new"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2E9BFF] to-[#2A4FE0] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_36px_-12px_rgba(59,107,246,0.9)] transition hover:brightness-110"
        >
          Get Started <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.section>
  );
}
