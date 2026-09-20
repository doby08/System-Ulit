"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/client/hooks";
import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  Lock,
  Mic,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Users,
} from "lucide-react";

const FEATURES = [
  { icon: Sparkles, title: "AI Assisted", subtitle: "Questions" },
  { icon: BarChart3, title: "Data Analytics", subtitle: "& Reports" },
  { icon: ShieldCheck, title: "Secure", subtitle: "& Reliable" },
  { icon: Users, title: "For a Better", subtitle: "WPU Community" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("Admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(username.trim(), password, remember);
      if ("user" in result) {
        const next = searchParams.get("next") || "/admin";
        router.replace(next);
      } else {
        setError(result.message);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const registered = searchParams.get("registered") === "1";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070F] text-white">
      <div className="absolute inset-0">
        {/* Campus background reference: image/Campusbackground.jpg (published as /wpu-campus.jpg) */}
        <Image
          src="/wpu-campus.jpg"
          alt="Western Philippines University Main Campus, Aborlan, Palawan"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_center]"
        />
        {/* Readability layers: navy fade on the left (hero side) + soft vignette for the glass card. */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#03060F]/95 via-[#05070F]/72 to-[#05070F]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070F]/88 via-transparent to-[#05070F]/35" />
        <div className="absolute inset-0 bg-[radial-gradient(115%_85%_at_72%_45%,rgba(5,7,15,0.62)_0%,rgba(5,7,15,0.18)_55%,transparent_100%)]" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-amber-300/70 ring-offset-2 ring-offset-[#05070F] sm:h-14 sm:w-14">
            <Image src="/wpu-logo.jpg" alt="WPU logo" fill className="object-cover" priority />
          </div>
          <div>
            <p className="text-base font-bold leading-tight sm:text-lg">Western Philippines University</p>
            <p className="text-xs text-slate-300 sm:text-sm">Aborlan, Palawan</p>
          </div>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-10 py-8 lg:flex-row lg:items-center lg:justify-between lg:gap-8 xl:gap-16">
          <section className="w-full max-w-xl text-center lg:text-left">
            <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-slate-200/90 sm:text-xs">AI Assistance Interview System</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] sm:text-5xl xl:text-6xl">Smarter Interviews.<br />
              <span className="bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">Better Insights.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-200/90 sm:text-base lg:mx-0">Empowering the WPU community through AI-assisted interviews and surveys for a better, data-driven future.</p>
            <div className="mt-8 hidden grid-cols-4 gap-3 sm:grid lg:max-w-lg">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border border-white/10 bg-[#0A0F20]/60 px-2 py-3 text-center backdrop-blur-md">
                  <f.icon className="mx-auto h-5 w-5 text-cyan-300" />
                  <p className="mt-2 text-[11px] font-medium leading-tight text-slate-100">{f.title}</p>
                  <p className="text-[11px] leading-tight text-slate-300">{f.subtitle}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="w-full max-w-md">
            <div className="rounded-3xl border border-cyan-300/25 bg-[#0A0F20]/72 p-6 shadow-[0_0_70px_-24px_rgba(34,211,238,0.55)] backdrop-blur-xl sm:p-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600">
                  <Mic className="h-7 w-7 text-white" />
                </div>
                <h2 className="mt-4 text-2xl font-bold">AI Interview &amp; Survey</h2>
                <p className="mt-1 text-sm text-slate-300">Western Philippines University</p>
                <div className="mt-3 h-0.5 w-12 rounded-full bg-cyan-400/80" />
              </div>
              {registered && !error && (
                <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">Account created! Sign in with your new credentials.</div>
              )}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="login-username" className="mb-1.5 block text-xs font-medium text-slate-300">Username</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="login-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" required autoComplete="username" className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/20" />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-11 pr-11 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/20" />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
              <div className="flex items-center justify-between text-xs">
                <label className="flex cursor-pointer select-none items-center gap-2 text-slate-300">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded accent-cyan-400" />
                  Remember me
                </label>
                <span className="cursor-not-allowed text-cyan-300/70" title="Password reset is not enabled in this deployment">Forgot password?</span>
              </div>
              <button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex w-full items-center justify-center">
                    <span className="flex-1 text-center">Sign In</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    <span className="w-4" />
                  </span>
                )}
              </button>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-white/15" />
                or
                <span className="h-px flex-1 bg-white/15" />
              </div>
              <Link href="/register" className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 py-3 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/10">
                <UserPlus className="h-4 w-4" />
                Create an Account
              </Link>
              <p className="pt-1 text-center text-xs text-slate-400">Default: Admin / admin123</p>
              </form>
            </div>
          </section>
        </main>
        <footer className="flex flex-col items-center justify-between gap-4 pb-2 sm:flex-row">
          <div className="grid w-full grid-cols-2 gap-3 sm:hidden">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-white/10 bg-[#0A0F20]/60 px-2 py-3 text-center backdrop-blur-md">
                <f.icon className="mx-auto h-5 w-5 text-cyan-300" />
                <p className="mt-2 text-[11px] font-medium leading-tight text-slate-100">{f.title}</p>
                <p className="text-[11px] leading-tight text-slate-300">{f.subtitle}</p>
              </div>
            ))}
          </div>
          <p className="hidden text-[11px] uppercase tracking-[0.22em] text-slate-300/80 sm:block">Learn · Serve · Transform</p>
          <p className="text-right text-lg italic leading-tight text-white/90">WPU<br /><span className="text-base">Your Voice</span><br /><span className="text-base">Builds a Brighter</span><br />Future</p>
        </footer>
      </div>
    </div>
  );
}
