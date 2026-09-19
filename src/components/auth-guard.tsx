'use client';

import { useEffect, ReactNode, Component, ErrorInfo } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return fallback ?? (
      <div className="flex items-center justify-center min-h-screen bg-[rgb(var(--bg-base))]">
        <div className="space-y-4 w-full max-w-2xl">
          <Skeleton className="h-12 w-48 mx-auto" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}

// Error boundary for catching React errors
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class AuthGuardErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AuthGuard] Caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#05070F] text-white">
          <div className="text-center max-w-md p-6">
            <h2 className="text-xl font-bold mb-2">Oops! Something went wrong</h2>
            <p className="text-slate-400 mb-4">We encountered an error loading the page.</p>
            {this.state.error && (
              <details className="mb-4 text-left bg-white/5 rounded-lg p-3 text-xs text-slate-400 font-mono overflow-auto max-h-32">
                <summary className="cursor-pointer text-slate-500 hover:text-slate-300">
                  Error details (click to expand)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-[#3B6BF6] rounded-lg hover:bg-[#5C88FB] transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = "/login"}
                className="px-4 py-2 bg-transparent border border-slate-600 rounded-lg hover:bg-white/5 transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
