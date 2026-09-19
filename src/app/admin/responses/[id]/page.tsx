"use client";

import { useParams, useRouter } from "next/navigation";
import { useResponseDetail } from "@/lib/client/hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ResponseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: response, loading, refetch } = useResponseDetail(params?.id ?? "");

  if (!params?.id) return <div className="p-6">Invalid response ID</div>;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!response) {
    return <div className="p-6 text-center text-[var(--text-secondary)]">Response not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Response Detail</h1>
        <Badge variant={response.status === "COMPLETE" ? "success" : "warning"}>{response.status}</Badge>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Response Metadata</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-[var(--text-secondary)]">Survey:</span> <span className="text-[var(--text-primary)]">{response.surveyTitle}</span></div>
          <div><span className="text-[var(--text-secondary)]">Source:</span> <span className="text-[var(--text-primary)]">{response.source}</span></div>
          <div><span className="text-[var(--text-secondary)]">Submitted:</span> <span className="text-[var(--text-primary)]">{response.submittedAt}</span></div>
          <div><span className="text-[var(--text-secondary)]">Duration:</span> <span className="text-[var(--text-primary)]">{response.durationSec ? `${response.durationSec}s` : "—"}</span></div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Answers</h3>
        <div className="space-y-4">
          {response.answers?.map((a: any, i: number) => (
            <div key={i} className="border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0">
              <p className="text-sm text-[var(--text-secondary)] mb-1">{a.code} — {a.question}</p>
              <p className="text-[var(--text-primary)]">{a.answer}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
