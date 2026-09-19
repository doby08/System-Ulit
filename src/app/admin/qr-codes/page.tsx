"use client";

import { useMemo, useState } from "react";
import {
  useQRTokens,
  useSurveys,
  createQrCode,
  updateQrCode,
  deleteQrCode,
  getQrCodeDetail,
} from "@/lib/client/hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QrThumb } from "@/components/qr-thumb";
import { QrCode, Download, Copy, Share2, Pause, Play, RefreshCw, Trash2, Plus, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function QRCodesPage() {
  const { toast } = useToast();
  const { data: tokens, loading, refetch } = useQRTokens();
  const { data: surveys } = useSurveys();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [surveyId, setSurveyId] = useState("");
  const [label, setLabel] = useState("");

  const surveyOptions = useMemo(
    () =>
      (surveys ?? []).map((s) => ({
        value: s.id,
        label: `${s.title} — ${s.status}${s.questionCount ? ` (${s.questionCount} Q)` : " (no questions)"}`,
      })),
    [surveys],
  );

  const handleGenerate = async () => {
    if (!surveyId) {
      toast({ title: "Select a survey", message: "Choose which survey the QR code is for.", type: "warning" });
      return;
    }
    setCreating(true);
    try {
      await createQrCode({ surveyId, label: label.trim() || null });
      toast({ title: "QR code generated", message: "Scan it or share the link with your respondents.", type: "success" });
      setSurveyId("");
      setLabel("");
      setShowForm(false);
      refetch();
    } catch (e: any) {
      toast({ title: "Could not generate QR", message: e?.message ?? "Try again.", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const download = async (id: string) => {
    setBusyId(id);
    try {
      const detail = await getQrCodeDetail(id);
      if (!detail?.dataUrl) throw new Error("QR image unavailable");
      const a = document.createElement("a");
      a.href = detail.dataUrl;
      a.download = `survey-qr-${id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      toast({ title: "Download failed", message: e?.message ?? "Try again.", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = async (id: string, status: "ACTIVE" | "DISABLED") => {
    setBusyId(id);
    try {
      await updateQrCode(id, { status });
      toast({
        title: status === "ACTIVE" ? "QR re-enabled" : "QR disabled",
        message: status === "ACTIVE" ? "Respondents can use it again." : "Further scans will be rejected.",
        type: "success",
      });
      refetch();
    } catch (e: any) {
      toast({ title: "Update failed", message: e?.message ?? "Try again.", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const rotate = async (id: string) => {
    if (!confirm("Rotate this token? The old link and any printed QR code stop working.")) return;
    setBusyId(id);
    try {
      await updateQrCode(id, { regenerate: true });
      toast({ title: "Token rotated", message: "Download and reprint the QR code.", type: "success" });
      refetch();
    } catch (e: any) {
      toast({ title: "Rotate failed", message: e?.message ?? "Try again.", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this QR code? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await deleteQrCode(id);
      toast({ title: "QR code deleted", type: "success" });
      refetch();
    } catch (e: any) {
      toast({ title: "Delete failed", message: e?.message ?? "Try again.", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">QR Interview</h1>
          <p className="text-sm text-slate-400">Publish surveys and share QR interview links.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="gradient" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? "Cancel" : "Generate QR Code"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-white">Generate a QR code</h2>
            <p className="text-xs text-slate-400 mt-1">
              Each QR code links to one survey. Publish the survey first so respondents receive a frozen version.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Survey</Label>
              <Select
                value={surveyId}
                onChange={setSurveyId}
                options={surveyOptions}
                placeholder={surveyOptions.length ? "Select a survey..." : "No surveys yet - create one first"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-label">Label (optional)</Label>
              <Input
                id="qr-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Library lobby poster"
              />
            </div>
          </div>
          <Button variant="gradient" onClick={handleGenerate} disabled={creating || !surveyId}>
            {creating ? "Generating..." : "Generate QR Code"}
          </Button>
        </Card>
      )}

      {!tokens?.length ? (
        <div className="text-center py-12">
          <QrCode className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">No QR codes generated yet.</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Click "Generate QR Code" to create one for any interview/survey.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens.map((token) => (
            <Card key={token.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">{token.surveyTitle}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 truncate">{token.topic}</p>
                  {token.label && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 truncate">{token.label}</p>
                  )}
                </div>
                <Badge variant={token.status === "ACTIVE" ? "success" : "default"}>{token.status}</Badge>
              </div>

              <div className="mt-4 flex justify-center bg-white p-3 rounded-xl">
                <QrThumb id={token.id} size={176} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{token.scans}</p>
                  <p className="text-[var(--text-muted)]">Scans</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{token.responses}</p>
                  <p className="text-[var(--text-muted)]">Responses</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{token.completions}</p>
                  <p className="text-[var(--text-muted)]">Completed</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" title="Open the respondent page" onClick={() => window.open(token.publicUrl, "_blank")}>
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" title="Copy link" onClick={() => copyLink(token.publicUrl, token.id)}>
                  {copiedToken === token.id ? "Copied!" : <Copy className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" title="Download PNG" disabled={busyId === token.id} onClick={() => download(token.id)}>
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title={token.status === "ACTIVE" ? "Disable this QR" : "Re-enable this QR"}
                  disabled={busyId === token.id}
                  onClick={() => setStatus(token.id, token.status === "ACTIVE" ? "DISABLED" : "ACTIVE")}
                >
                  {token.status === "ACTIVE" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" title="Rotate token" disabled={busyId === token.id} onClick={() => rotate(token.id)}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Delete"
                  className="text-rose-300"
                  disabled={busyId === token.id}
                  onClick={() => remove(token.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2 truncate" title={token.publicUrl}>
                {token.publicUrl}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Created {new Date(token.createdAt).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}