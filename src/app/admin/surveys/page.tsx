"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSurveys, deleteSurvey, publishSurvey, duplicateSurvey, restoreSurvey } from "@/lib/client/hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreVertical, Edit, Trash2, Copy, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { surveyStatusMeta, INTERVIEW_METHODS, INTERVIEW_MODES } from "@/lib/constants";

export default function SurveysPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: surveys, loading, error, refetch } = useSurveys({ search });
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("search") ?? "";
    if (q) setSearch(q);
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Move "${title}" to trash? You can restore it later.`)) return;
    try {
      await deleteSurvey(id);
      toast({ title: "Moved to trash", message: "Survey moved to trash bin. You can restore it anytime.", type: "success" });
      refetch();
    } catch (e: any) {
      toast({ title: "Action failed", message: e?.message, type: "error" });
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreSurvey(id);
      toast({ title: "Restored", message: "Survey restored successfully.", type: "success" });
      refetch();
    } catch (e: any) {
      toast({ title: "Restore failed", message: e?.message, type: "error" });
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishSurvey(id);
      toast({ title: "Published", message: "QR codes can now be generated.", type: "success" });
      refetch();
    } catch (e: any) {
      toast({ title: "Publish failed", message: e?.message, type: "error" });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateSurvey(id);
      toast({ title: "Duplicated", type: "success" });
      refetch();
    } catch (e: any) {
      toast({ title: "Duplicate failed", message: e?.message, type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto animate-in-fade">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">My Interviews &amp; Surveys</h1>
          <p className="text-sm text-slate-400">Manage, publish, and track every interview.</p>
        </div>
        <Link href="/admin/surveys/new">
          <Button variant="gradient">
            <Plus className="w-4 h-4" />
            New Interview/Survey
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <Input
          placeholder="Search surveys..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {error && <p className="text-rose-300">{error}</p>}

      {!surveys?.length ? (
        <div className="text-center py-12">
          <p className="text-[var(--text-secondary)]">No surveys found. Create your first survey to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys.map((s) => {
            const status = surveyStatusMeta(s.status);
            const method = INTERVIEW_METHODS.find((m) => m.value === s.interviewMethod);
            const mode = INTERVIEW_MODES.find((m) => m.value === s.interviewMode);
            return (
              <Card key={s.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--text-primary)]">{s.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{s.topic}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="default">{method?.short ?? s.interviewMethod}</Badge>
                      <Badge variant="outline">{mode?.label ?? s.interviewMode}</Badge>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      {s.questionCount} questions • {s.responseCount} responses • v{s.version}
                    </p>
                  </div>
                                  <DropdownMenu
                    trigger={<MoreVertical className="w-4 h-4 text-[var(--text-muted)] cursor-pointer" />}
                    items={[
                      { label: "Manage", icon: <Edit className="w-4 h-4" />, onClick: () => router.push(`/admin/surveys/${s.id}`) },
                      { label: "Analytics", icon: <BarChart3 className="w-4 h-4" />, onClick: () => router.push(`/admin/analytics?surveyId=${s.id}`) },
                      { label: "Duplicate", icon: <Copy className="w-4 h-4" />, onClick: () => handleDuplicate(s.id) },
                      {
                        label: "Move to Trash",
                        icon: <Trash2 className="w-4 h-4" />,
                        variant: "danger" as const,
                        onClick: () => handleDelete(s.id, s.title),
                      },
                    ]}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant={s.status === "PUBLISHED" ? "success" : s.status === "DRAFT" ? "warning" : "default"}>
                    {status.label}
                  </Badge>
                  {s.status !== "PUBLISHED" && (
                    <Button size="sm" variant="secondary" onClick={() => handlePublish(s.id)}>
                      Publish
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
