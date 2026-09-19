import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Login — WPU AI Interview & Survey",
  description: "Western Philippines University administrator sign-in",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#05070F] text-slate-400 text-sm">Loading sign-in…</div>}>
      <LoginForm />
    </Suspense>
  );
}

