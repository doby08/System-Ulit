"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { QrThumb } from "@/components/qr-thumb";
import {
  getSurveyDetail,
  useSurveyQuestions,
  generateQuestions,
  publishSurvey,
  createQrCode,
} from "@/lib/client/hooks";
import { useToast } from "@/components/ui/toast";
import { MAX_QUESTIONS_PER_SURVEY } from "@/lib/constants";
import { ArrowLeft, Copy, ExternalLink, QrCode, Rocket, Sparkles } from "lucide-react";

export default function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [creatingQr, setCreatingQr] = useState(false);
  const [qr, setQr] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const autoRan = useRef(false);
  const { toast } = useToast();
  const { data: questions, loading: qLoading, refetch: refetchQ } = useSurveyQuestions(id);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const loadDetail = () => {
    if (!id) return;
    getSurveyDetail(id).then(setDetail).catch(() => {});
  };

  useEffect(loadDetail, [id]);

  const runGenerate = async (overrideCount?: number) => {
    if (!id) return;
    const remaining = MAX_QUESTIONS_PER_SURVEY - (questions?.length ?? 0);
    if (remaining <= 0) {
      toast({ title: "Maximum reached", message: `Surveys support up to ${MAX_QUESTIONS_PER_SURVEY} questions.`, type: "warning" });
      return;
    }
    setGenerating(true);
    try {
      const res = await generateQuestions(id, { count: Math.min(overrideCount ?? count, remaining) });
      const saved = res.saved ?? res.questions?.length ?? 0;
      toast({
        title: `Generated ${saved} question${saved === 1 ? "" : "s"}`,
        message: `Saved to this survey. Provider: ${res.provider}${res.limitReached ? " (question limit reached)" : ""}`,
        type: "success",
      });
      refetchQ();
      loadDetail();
    } catch (e: any) {
      toast({ title: "Generation failed", message: e?.message, type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate right after creation (Create passes ?generate=N).
  useEffect(() => {
    if (!id || qLoading || autoRan.current) return;
    const requested = Number(new URLSearchParams(window.location.search).get("generate") ?? "");
    if (!requested) return;
    autoRan.current = true;
    setCount(requested);
    runGenerate(requested);
    window.history.replaceState({}, '', `/admin/surveys/${id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, qLoading, questions]);

  const handlePublish = async () => {
    if (!id) return;
    setPublishing(true);
    try {
      const updated = await publishSurvey(id);
      setDetail((prev: any) => ({ ...(prev ?? {}), ...updated }));
      toast({ title: "Survey published", message: "You can now generate a QR code.", type: "success" });
    } catch (e: any) {
      toast({ title: "Publish failed", message: e?.message, type: "error" });
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerateQr = async () => {
    if (!id) return;
    setCreatingQr(true);
    try {
      const created = await createQrCode({ surveyId: id });
      setQr(created);
      toast({ title: "QR code generated", message: "Scan it or share the link with respondents.", type: "success" });
    } catch (e: any) {
      toast({ title: "Could not generate QR", message: e?.message ?? "Try again.", type: "error" });
    } finally {
      setCreatingQr(false);
    }
  };

  const isPublished = detail?.status === "PUBLISHED";
  const questionCount = questions?.length ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5 animate-in-fade">
      <Link href="/admin/surveys" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to My Interviews &amp; Surveys
      </Link>

      {!detail ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">{detail.title}</h1>
            <p className="text-sm text-slate-400 mt-1">{detail.topic}</p>
            <div className="mt-2 flex gap-2 flex-wrap">
              <Badge variant="info">{detail.interviewMethod}</Badge>
              <Badge variant="outline">{detail.interviewMode}</Badge>
              <Badge variant={isPublished ? "success" : "warning"}>{detail.status}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isPublished && (
              <Button variant="gradient" onClick={handlePublish} disabled={publishing}>
                <Rocket className="w-4 h-4" /> {publishing ? "Publishing..." : "Publish"}
              </Button>
            )}
            <Button variant="secondary" onClick={handleGenerateQr} disabled={creatingQr}>
              <QrCode className="w-4 h-4" /> {creatingQr ? "Creating QR..." : "Generate QR Code"}
            </Button>
          </div>
        </div>
      )}

      {qr && (
        <Card className="p-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <QrCode className="w-4 h-4" /> QR code for this survey
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <div className="bg-white p-3 rounded-xl">
              <QrThumb id={qr.id} size={160} />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-xs text-slate-400 break-all">{qr.publicUrl}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(qr.publicUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  <Copy className="w-4 h-4" /> {copied ? "Copied!" : "Copy link"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => window.open(qr.publicUrl, "_blank")}>
                  <ExternalLink className="w-4 h-4" /> Open
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">Also available anytime under QR Interview.</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-semibold text-white">AI Question Generation</h2>
        <p className="text-xs text-slate-400 mt-1">
          Maximum {MAX_QUESTIONS_PER_SURVEY} questions per survey. Currently {questionCount}.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 items-center">
          <Input
            type="number"
            min={1}
            max={MAX_QUESTIONS_PER_SURVEY}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-28"
            aria-label="Number of questions to generate"
          />
          <Button variant="gradient" onClick={() => runGenerate()} disabled={generating || !id}>
            <Sparkles className="w-4 h-4" /> {generating ? "Generating..." : "Generate Questions"}
          </Button>
          <Button variant="ghost" onClick={() => refetchQ()}>Refresh</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-white mb-3">Questions ({questionCount})</h2>
        {qLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !questions?.length ? (
          <p className="text-sm text-slate-400">
            No questions yet - choose how many to generate above, then click Generate Questions.
          </p>
        ) : (
          <ol className="space-y-2">
            {questions.map((q: any, i: number) => (
              <li key={q.id ?? i} className="rounded-xl border border-white/10 p-3 text-sm text-slate-200">
                <span className="text-slate-500 mr-2">{i + 1}.</span>
                {q.text}
                <span className="ml-2 text-[11px] text-slate-500">{q.type}</span>
              </li>
            ))}
          </ol>
        )}
        {!isPublished && questionCount > 0 && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <Button variant="gradient" onClick={handlePublish} disabled={publishing}>
              <Rocket className="w-4 h-4" /> {publishing ? "Publishing..." : "Publish this survey"}
            </Button>
            <p className="text-[11px] text-slate-500 mt-2">
              Publishing freezes the current question set as a version and enables QR distribution.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
