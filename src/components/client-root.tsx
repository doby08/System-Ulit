'use client';

import type { ReactNode } from "react";
import { Providers } from "@/components/providers";

export function ClientRoot({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
