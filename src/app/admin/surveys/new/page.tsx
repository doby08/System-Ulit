"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSurvey } from "@/lib/client/hooks";
import { useToast } from "@/components/ui/toast";
import {
  INTERVIEW_METHODS,
  INTERVIEW_MODES,
  LANGUAGES,
  MAX_QUESTIONS_PER_SURVEY,
} from "@/lib/constants";
import { ArrowLeft, Sparkles } from "lucide-react";

const STAKEHOLDERS = ["Students", "Faculty", "Staff", "Alumni", "Parents", "Community", "Employees", "Citizens / Residents"];
const QUESTION_COUNTS = [5, 10, 15, 20, 25, 30, 40, 50];

export default function NewSurveyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    topic: "",
    description: "",
    stakeholder: "Students",
    interviewMethod: "STRUCTURED",
    interviewMode: "INDIVIDUAL",
    language: "en",
    questionCount: 10,
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.title.trim().length >= 3 && form.topic.trim().length >= 3 && form.stakeholder.trim().length >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      const created = await createSurvey({
        title: form.title.trim(),
        topic: form.topic.trim(),
        description: form.description.trim(),
        stakeholder: form.stakeholder.trim(),
        interviewMethod: form.interviewMethod,
        interviewMode: form.interviewMode,
        language: form.language,
      });
      const id = (created as { id?: string }).id;
      toast({ title: "Interview/Survey created", message: "Opening the question builder...", type: "success" });
      router.push(`/admin/surveys/${id}?generate=${form.questionCount}`);
    } catch (err: any) {
      toast({ title: "Could not create", message: err?.message ?? "Try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 animate-in-fade">
      <Link href="/admin/surveys" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to My Interviews &amp; Surveys
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-white">Create Interview/Survey</h1>
        <p className="text-sm text-slate-400 mt-1">Draft an interview or survey, then generate up to {MAX_QUESTIONS_PER_SURVEY} AI questions.</p>
      </div>
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Student Satisfaction Survey 2026" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input id="topic" value={form.topic} onChange={(e) => set("topic", e.target.value)} placeholder="e.g. Satisfaction with library and registrar services" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What is this interview about?" rows={3} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stakeholder</Label>
              <Select value={form.stakeholder} onChange={(v) => set("stakeholder", v)} options={STAKEHOLDERS.map((s) => ({ value: s, label: s }))} />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={form.language} onChange={(v) => set("language", v)} options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Interview type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {INTERVIEW_METHODS.map((m) => (
                <button type="button" key={m.value} onClick={() => set("interviewMethod", m.value)}
                  className={`rounded-2xl border p-3 text-left transition ${form.interviewMethod === m.value ? "border-[#5C88FB] bg-[#3B6BF6]/10" : "border-white/10 hover:bg-white/5"}`}>
                  <p className="text-sm font-semibold text-white">{m.short}</p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-3">{m.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Interview mode</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {INTERVIEW_MODES.map((m) => (
                <button type="button" key={m.value} onClick={() => set("interviewMode", m.value)}
                  className={`rounded-2xl border p-3 text-left transition ${form.interviewMode === m.value ? "border-[#22D3EE] bg-cyan-500/10" : "border-white/10 hover:bg-white/5"}`}>
                  <p className="text-sm font-semibold text-white">{m.label}</p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-3">{m.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>How many questions should the AI generate?</Label>
            <Select
              value={String(form.questionCount)}
              onChange={(v) => set("questionCount", Number(v))}
              options={QUESTION_COUNTS.map((n) => ({
                value: String(n),
                label: `${n} questions`,
              }))}
              className="max-w-xs"
            />
            <p className="text-[11px] text-slate-500">
              Questions are generated automatically right after you create the survey. You can always
              generate more (up to {MAX_QUESTIONS_PER_SURVEY}) in the builder.
            </p>
          </div>
          <Button type="submit" variant="gradient" size="lg" disabled={!valid || saving} className="w-full sm:w-auto">
            <Sparkles className="w-4 h-4" /> {saving ? "Creating..." : "Create Interview/Survey"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
