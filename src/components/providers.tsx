'use client';

import { ReactNode, createContext, useContext, ErrorInfo, Component } from "react";
import { useAuth } from "@/lib/client/hooks";
import { Toaster } from "@/components/ui/toast";
import { NetworkProvider } from "@/components/ui/network-status";
import type { SessionUser } from "@/lib/types";

const AuthContext = createContext<{
  user: SessionUser | null;
  loading: boolean;
  refetch: () => Promise<void>;
} | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, refetch } = useAuth();
  return (
    <AuthContext.Provider value={{ user, loading, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
};

// Global error boundary to catch React errors
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GlobalErrorBoundary] Caught error:", error, errorInfo);
    this.setState({ errorInfo });
    
    // Log to monitoring service if available
    if (typeof window !== "undefined" && window.onerror) {
      window.onerror(`React error: ${error.message}`, undefined, undefined, undefined, error);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#05070F] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 mb-6 text-sm">
              We encountered an unexpected error. Please try again or refresh the page.
            </p>
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
                className="px-6 py-2.5 bg-[#3B6BF6] text-white rounded-lg hover:bg-[#5C88FB] transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = "/login"}
                className="px-6 py-2.5 bg-transparent border border-slate-600 text-slate-300 rounded-lg hover:bg-white/5 transition-colors font-medium"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <AuthProvider>
        <NetworkProvider>
          <Toaster>
            {this.props.children}
          </Toaster>
        </NetworkProvider>
      </AuthProvider>
    );
  }
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GlobalErrorBoundary>
      {children}
    </GlobalErrorBoundary>
  );
}
