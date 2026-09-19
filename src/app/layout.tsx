import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { cn } from "@/lib/utils";
import { ClientRoot } from "@/components/client-root";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI Interview & Survey System — Western Philippines University",
    template: "%s — WPU AI Interview & Survey",
  },
  description:
    "Western Philippines University Main Campus, Aborlan, Palawan — centralized AI-powered interview assistance and survey instrument system.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/wpu-logo.jpg", apple: "/wpu-logo.jpg" },
  appleWebApp: { title: "WPU InterviewAI" },
};

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fontDisplay = Inter_Tight({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["600","700","800","900"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={cn("min-h-screen bg-[rgb(var(--bg-base))] antialiased text-[var(--text-primary)] flex flex-col", fontSans.variable, fontDisplay.variable)}>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
