"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/client/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Lock, User } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("Admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(username, password);
      if ("user" in result) {
        const next = searchParams.get("next") || "/admin";
        router.replace(next);
      } else {
        setError(result.message);
      }
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070F] flex items-center justify-center">
      <div className="absolute inset-0">
        <Image src="/wpu-campus.jpg" alt="" fill priority className="object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05070F] via-[#05070F]/85 to-[#05070F]/50" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <div className="relative w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 ring-2 ring-amber-300/60 ring-offset-4 ring-offset-[#05070F]">
            <Image src="/wpu-logo.jpg" alt="WPU logo" fill className="object-cover" priority />
          </div>
          <h1 className="text-2xl font-bold text-white">AI Interview &amp; Survey</h1>
          <p className="text-sm text-[#8FB0FF]">Western Philippines University</p>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Aborlan, Palawan · Main Campus</p>
        </div>
        <Card className="border-white/10 bg-[#0A0F20]/85 backdrop-blur-xl">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold text-white">Administrator Sign In</p>
            <p className="text-xs text-slate-400 mb-5">Sign in to manage interviews, surveys, and insights.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10" placeholder="Enter username" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" placeholder="Enter password" required />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="text-sm text-rose-300 bg-rose-500/5 border border-rose-400/30 rounded-lg p-3">{error}</div>}
              <Button type="submit" variant="gradient" size="lg" disabled={loading} className="w-full">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : ("Sign In")}
              </Button>
              <p className="text-center text-[11px] text-slate-500 pt-2">WPU Aborlan · Learn. Serve. Transform.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
