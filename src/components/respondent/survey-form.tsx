"use client";

import { useMemo, useRef, useState } from "react";
import type {
  AnswerPayload,
  PublicQuestion,
  PublicSurveyPayload,
  RespondentPayload,
} from "@/lib/types";
import { submitPublicResponse } from "@/lib/client/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";

/** Builds one AnswerPayload for a question from the current answer state. */
function buildAnswer(question: PublicQuestion, answer?: AnswerPayload): AnswerPayload | null {
  if (!answer) return null;
  if (
    answer.valueText ||
    typeof answer.valueNumber === "number" ||
    answer.valueOption ||
    (answer.valueOptions && answer.valueOptions.length) ||
    typeof answer.valueBool === "boolean"
  ) {
    return { ...answer, questionId: question.id };
  }
  return null;
}

function isAnswered(answer?: AnswerPayload): boolean {
  if (!answer) return false;
  return Boolean(
    (answer.valueText && answer.valueText.trim()) ||
      typeof answer.valueNumber === "number" ||
      (answer.valueOption && answer.valueOption.trim()) ||
      (answer.valueOptions && answer.valueOptions.length) ||
      typeof answer.valueBool === "boolean",
  );
}

const DEMOGRAPHIC_KEYS = ["name", "respondentCode", "ageGroup", "gender", "location", "organization", "email"] as const;

export function SurveyForm({ payload }: { payload: PublicSurveyPayload }) {
  const startedAt = useRef(Date.now());
  const [answers, setAnswers] = useState<Record<string, AnswerPayload>>({});
  const [respondent, setRespondent] = useState<Partial<RespondentPayload>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const enabledDemographics = useMemo(
    () => payload.settings.demographics.filter((d) => d.enabled && DEMOGRAPHIC_KEYS.includes(d.key as never)),
    [payload.settings.demographics],
  );

  const answeredCount = payload.questions.filter((q) => isAnswered(answers[q.id])).length;
  const requiredCount = payload.questions.filter((q) => q.isRequired).length;
  const requiredAnswered = payload.questions.filter((q) => q.isRequired && isAnswered(answers[q.id])).length;
  const progress = requiredCount ? Math.round((requiredAnswered / requiredCount) * 100) : 0;

  const setAnswer = (
    question: PublicQuestion,
    patch: Omit<AnswerPayload, "questionId">,
  ) => {
    setAnswers((prev) => ({ ...prev, [question.id]: { ...prev[question.id], ...patch } }));
    setMissing((prev) => prev.filter((id) => id !== question.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const unanswered = payload.questions.filter((q) => q.isRequired && !isAnswered(answers[q.id]));
    if (unanswered.length) {
      setMissing(unanswered.map((q) => q.id));
      setError("Please answer all required questions before submitting.");
      document.getElementById(`q-${unanswered[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    for (const field of enabledDemographics) {
      if (field.required && !(respondent as Record<string, unknown>)[field.key]) {
        setError(`Please fill in the required field: ${field.label}.`);
        return;
      }
    }

    const answerPayload = payload.questions
      .map((question) => buildAnswer(question, answers[question.id]))
      .filter((a): a is AnswerPayload => Boolean(a));
    if (!answerPayload.length) {
      setError("Please answer at least one question.");
      return;
    }

    const cleanedRespondent: RespondentPayload = {};
    for (const [key, value] of Object.entries(respondent)) {
      if (typeof value === "string" && value.trim()) {
        cleanedRespondent[key as keyof RespondentPayload] = value.trim();
      }
    }

    setSubmitting(true);
    try {
      await submitPublicResponse({
        clientResponseId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        token: payload.token,
        language: payload.language,
        device: navigator.userAgent.slice(0, 60),
        networkState: navigator.onLine ? "ONLINE" : "OFFLINE",
        source: "ONLINE",
        capturedAt: new Date().toISOString(),
        durationSec: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)),
        status: "COMPLETE",
        respondent: Object.keys(cleanedRespondent).length ? cleanedRespondent : null,
        answers: answerPayload,
      });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message ?? "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAnswers({});
    setRespondent({});
    setMissing([]);
    setError(null);
    setDone(false);
    startedAt.current = Date.now();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderQuestion = (question: PublicQuestion) => {
    const answer = answers[question.id];
    const options = question.options ?? [];
    const buttonBase = "flex-1 min-w-[9rem] rounded-xl border px-3 py-2.5 text-sm transition text-center";
    const chosen = "border-[#5C88FB] bg-[#3B6BF6]/20 text-white";
    const idle = "border-white/15 text-slate-300 hover:bg-white/5";
    const choose = (option: { label: string; value: string; score?: number }) =>
      setAnswer(question, { valueOption: option.value, valueNumber: option.score ?? null });

    if (["LIKERT_5", "LIKERT_7", "RATING", "YES_NO"].includes(question.type)) {
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button key={option.value} type="button" onClick={() => choose(option)} className={`${buttonBase} ${answer?.valueOption === option.value ? chosen : idle}`}>
              {option.label}
            </button>
          ))}
        </div>
      );
    }

    if (question.type === "MULTIPLE_CHOICE") {
      return (
        <div className="space-y-2">
          {options.map((option) => (
            <button key={option.value} type="button" onClick={() => choose(option)} className={`${buttonBase} w-full text-left ${answer?.valueOption === option.value ? chosen : idle}`}>
              {option.label}
            </button>
          ))}
        </div>
      );
    }

    if (question.type === "MULTI_SELECT") {
      const selected = answer?.valueOptions ?? [];
      return (
        <div className="space-y-2">
          {options.map((option) => {
            const active = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  const next = active ? selected.filter((v) => v !== option.value) : [...selected, option.value];
                  setAnswer(question, { valueOptions: next });
                }}
                className={`${buttonBase} w-full text-left ${active ? "border-[#22D3EE] bg-cyan-500/15 text-white" : idle}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (question.type === "LONG_TEXT") {
      return (
        <Textarea rows={4} value={answer?.valueText ?? ""} onChange={(e) => setAnswer(question, { valueText: e.target.value })} placeholder="Share your thoughts..." />
      );
    }

    if (question.type === "NUMBER") {
      return (
        <Input
          type="number"
          value={answer?.valueNumber ?? ""}
          onChange={(e) => setAnswer(question, { valueNumber: e.target.value === "" ? null : Number(e.target.value) })}
          placeholder="Enter a number"
        />
      );
    }

    if (question.type === "DATE") {
      return <Input type="date" value={answer?.valueText ?? ""} onChange={(e) => setAnswer(question, { valueText: e.target.value })} />;
    }

    return <Input value={answer?.valueText ?? ""} onChange={(e) => setAnswer(question, { valueText: e.target.value })} placeholder="Type your answer..." />;
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#05070F]">
        <Card className="p-8 max-w-lg w-full text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
          <h1 className="text-xl font-bold text-white">Response submitted</h1>
          <p className="text-sm text-slate-400">{payload.settings.thankYouMessage}</p>
          <Button variant="gradient" onClick={resetForm}>
            <RotateCcw className="w-4 h-4" /> Submit another response
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070F] text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-white">{payload.title}</h1>
          {payload.description && <p className="text-sm text-slate-400">{payload.description}</p>}
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {payload.stakeholder} · {payload.totalQuestions} questions
          </p>
          {payload.settings.showProgressBar && (
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#3B6BF6] to-[#22D3EE] transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          <p className="text-[11px] text-slate-500">
            {answeredCount} of {payload.questions.length} answered
          </p>
        </header>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {enabledDemographics.length > 0 && (
            <Card className="p-5 space-y-4">
              <h2 className="font-semibold text-white">About you</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {enabledDemographics.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={`d-${field.key}`}>
                      {field.label}
                      {field.required ? " *" : ""}
                    </Label>
                    <Input
                      id={`d-${field.key}`}
                      value={(respondent as Record<string, string>)[field.key] ?? ""}
                      onChange={(e) => setRespondent((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {payload.questions.map((question, index) => (
            <Card key={question.id} id={`q-${question.id}`} className={`p-5 space-y-3 ${missing.includes(question.id) ? "border-rose-400/40" : ""}`}>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  <span className="text-slate-500 mr-2">{index + 1}.</span>
                  {question.text}
                  {question.isRequired && <span className="text-rose-400 ml-1">*</span>}
                </p>
                {question.helpText && <p className="text-xs text-slate-400">{question.helpText}</p>}
              </div>
              {renderQuestion(question)}
            </Card>
          ))}

          <div className="flex justify-center pt-2 pb-10">
            <Button type="submit" variant="gradient" size="lg" disabled={submitting} className="min-w-[14rem]">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Response"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}