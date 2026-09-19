import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import LoginBackground from "@/components/login-background";

export const metadata = {
  title: "Login — WPU AI Interview & Survey",
  description: "Western Philippines University administrator sign-in",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070F]">
      <LoginBackground />
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-[#05070F] text-slate-400 text-sm">
          Loading sign-in…
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}

