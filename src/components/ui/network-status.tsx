"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Wifi, WifiOff, Cloud, CloudUpload } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/toast";

type ConnectionStatus = "online" | "offline";

export function useNetworkStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",
  );

  useEffect(() => {
    const update = () => setStatus(navigator.onLine ? "online" : "offline");
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return status;
}

export function NetworkStatusIndicator() {
  const status = useNetworkStatus();
  const { toast } = useToast();
  const [prevStatus, setPrevStatus] = useState(status);

  useEffect(() => {
    if (prevStatus === "offline" && status === "online") {
      toast({ title: "Connection restored", type: "success", duration: 3000 });
    } else if (prevStatus === "online" && status === "offline") {
      toast({ title: "You are offline", message: "Responses will sync when connection returns.", type: "warning" });
    }
    setPrevStatus(status);
  }, [status, prevStatus, toast]);

  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
      >
        {status === "online" ? (
          <Wifi className="w-4 h-4 text-emerald-400" />
        ) : (
          <motion.div animate={{ opacity: [1, 0.3, 1] }}>
            <WifiOff className="w-4 h-4 text-rose-400" />
          </motion.div>
        )}
      </motion.div>
      <span className="text-xs text-[var(--text-secondary)]">
        {status === "online" ? "Online" : "Offline"}
      </span>
    </div>
  );
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
