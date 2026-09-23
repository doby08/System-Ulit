"use client";

/**
 * Segment error boundary — renders when a route throws during render/hydration.
 * Without this file a client crash showed a plain black screen with no way out.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: (Error & { digest?: string }) | undefined;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#05070F] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 15.5c-.77.833-.77 2.167 0 3l.732.75c.77.833 1.964.833 2.732 0L12 15.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-slate-400 mb-6 text-sm">
          The page hit an unexpected error. Try again, or go back to the sign-in page.
        </p>
        {error && (
          <details className="mb-4 text-left bg-white/5 rounded-lg p-3 text-xs text-slate-400 font-mono overflow-auto max-h-32">
            <summary className="cursor-pointer text-slate-500 hover:text-slate-300">Error details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              {error.message}
              {error.digest ? `\nDigest: ${error.digest}` : ""}
            </pre>
          </details>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[#3B6BF6] text-white rounded-lg hover:bg-[#5C88FB] transition-colors font-medium"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = "/login")}
            className="px-6 py-2.5 bg-transparent border border-slate-600 text-slate-300 rounded-lg hover:bg-white/5 transition-colors font-medium"
          >
            Go to Login
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-transparent border border-slate-600 text-slate-300 rounded-lg hover:bg-white/5 transition-colors font-medium"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}