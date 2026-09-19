"use client";

import Link from "next/link";
import { Bot, ArrowUpRight } from "lucide-react";

export function AiInsightCard({ dashboard }: { dashboard: any }) {
  const hasData = (dashboard?.totalResponses ?? 0) > 0;
  return (
    <section className="rounded-2xl border border-[#2DD4BF]/25 bg-[#0B2B33]/60 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#164e63] text-cyan-200">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="inline-block rounded-full bg-[#22D3EE]/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-cyan-200">
            AI-GENERATED INSIGHT
          </p>
          <p className="mt-1.5 text-xs leading-5 text-slate-300">
            {hasData
              ? `Satisfaction is ${dashboard.averageSatisfactionPercent}% across ${dashboard.totalResponses} responses. Open Analytics or AI Insights for sentiment, themes, and recommendations.`
              : "No data yet. Create an interview/survey, generate questions, and share the QR code to start collecting responses."}
          </p>
          {hasData && (
            <Link href="/admin/ai-insights" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-white">
              Open AI Insights <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
