'use client';

import { ReactNode, createContext, useContext } from "react";
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

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NetworkProvider>
        <Toaster>
          {children}
        </Toaster>
      </NetworkProvider>
    </AuthProvider>
  );
}
