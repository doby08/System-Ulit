import { Suspense } from "react";
import { RegisterForm } from "@/components/register-form";

export const metadata = {
  title: "Create Account — WPU AI Interview & Survey",
  description: "Create an administrator account for the WPU AI Interview & Survey System",
};

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-navy-950 text-slate-400 text-sm">
        Loading…
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
