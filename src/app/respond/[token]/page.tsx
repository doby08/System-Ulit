import { buildPublicSurveyPayload } from "@/lib/server/public-survey";
import { SurveyForm } from "@/components/respondent/survey-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Interview / Survey",
  description: "Answer this interview or survey — no account needed.",
  robots: { index: false },
};

function RespondError({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#05070F]">
      <div className="max-w-md w-full rounded-2xl border border-rose-400/30 bg-rose-500/10 p-8 text-center space-y-3">
        <h1 className="text-lg font-bold text-white">This survey link is not available</h1>
        <p className="text-sm text-rose-200">{message}</p>
        <p className="text-xs text-slate-500">
          Please ask the administrator for a fresh link or QR code.
        </p>
      </div>
    </div>
  );
}

/**
 * Public respondent entry point — the destination of every QR code / shared link
 * (`/respond/{token}`). The prepared (published-version) question set is loaded on
 * the server; the interactive form is a client component.
 */
export default async function RespondPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    const payload = await buildPublicSurveyPayload(token, { trackScan: true });
    return <SurveyForm payload={payload} />;
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message)
        : "The link may be expired, disabled, or incorrect.";
    return <RespondError message={message} />;
  }
}