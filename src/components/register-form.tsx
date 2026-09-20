"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getErrorMessage } from "@/lib/client/api";
import type { SessionUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Lock, User, Mail, Building2, IdCard } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      await api.post<{ user: SessionUser }>("/api/auth/register", {
        username: username.trim(),
        password,
        confirmPassword,
        fullName: fullName.trim(),
        email: email.trim() === "" ? undefined : email.trim(),
        organization: organization.trim() === "" ? undefined : organization.trim(),
      });
      router.replace("/login?registered=1");
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070F] flex items-center justify-center py-10">
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
            <p className="text-sm font-semibold text-white">Create Administrator Account</p>
            <p className="text-xs text-slate-400 mb-5">Register to manage interviews, surveys, and insights.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10" placeholder="Choose a username (min 3 chars)" required minLength={3} maxLength={60} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" placeholder="e.g. Juan Dela Cruz" required minLength={2} maxLength={160} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email <span className="text-slate-500 font-normal">(optional)</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="you@example.com" maxLength={200} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Organization <span className="text-slate-500 font-normal">(optional)</span></label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} className="pl-10" placeholder="Department / office" maxLength={160} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" placeholder="Min 8 chars, upper + lower + number" required minLength={8} maxLength={200} />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" placeholder="Repeat password" required minLength={8} maxLength={200} />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Password must include at least 8 chars, one lowercase, one uppercase, and one number.</p>
              {error && <div className="text-sm text-rose-300 bg-rose-500/5 border border-rose-400/30 rounded-lg p-3">{error}</div>}
              <Button type="submit" variant="gradient" size="lg" disabled={loading} className="w-full">
                {loading ? "Creating account..." : "Create Account"}
              </Button>
              <p className="text-center text-xs text-slate-400">
                Already have an account?{" "}
                <Link href="/login" className="text-[#8FB0FF] hover:text-white font-medium">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

