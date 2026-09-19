"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Search, Send, ThumbsUp, MessageSquare } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Help & Support</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-indigo-500/10"><BookOpen className="w-5 h-5 text-indigo-400" /></div>
            <h3 className="font-semibold text-[var(--text-primary)]">Getting Started</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Learn how to create your first survey, generate AI questions, and publish.</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-cyan-500/10"><MessageSquare className="w-5 h-5 text-cyan-400" /></div>
            <h3 className="font-semibold text-[var(--text-primary)]">Interview Methods</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Understand Structured, Semi-Structured, and Unstructured interviews.</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-purple-500/10"><Send className="w-5 h-5 text-purple-400" /></div>
            <h3 className="font-semibold text-[var(--text-primary)]">QR & Offline Mode</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Generate QR codes and handle offline responses with auto-sync.</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            { q: "How many questions can I add?", a: "Up to 50 questions per survey. AI can generate all 50 at once." },
            { q: "Do respondents need an account?", a: "No. Respondents access the survey via QR code without login (unless you enable authentication in settings)." },
            { q: "How does offline mode work?", a: "The respondent PWA caches the survey. Answers are stored in IndexedDB and auto-sync when internet returns." },
            { q: "Can I edit questions after publishing?", a: "Yes, but it creates a new version. Existing respondents continue with their current version." },
          ].map((item, i) => (
            <div key={i} className="border-b border-[var(--border-subtle)] pb-3">
              <p className="font-medium text-[var(--text-primary)]">{item.q}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{item.a}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
