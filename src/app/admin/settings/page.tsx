"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Database } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ fullName: "", email: "" });
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => { setSettings(d.data); setLoading(false); }).catch(() => setLoading(false));
    fetch("/api/auth/session").then((r) => r.json()).then((d) => {
      if (d.data?.user) setProfile({ fullName: d.data.user.fullName ?? "", email: d.data.user.email ?? "" });
    });
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(profile) });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (passwords.new !== passwords.confirm) return;
    setSaving(true);
    try {
      await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ oldPassword: passwords.old, newPassword: passwords.new }) });
      setPasswords({ old: "", new: "", confirm: "" });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: Shield },
    { id: "security", label: "Security", icon: Shield },
    { id: "system", label: "System", icon: Database },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
      <div className="flex gap-6">
        <div className="w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-indigo-500/15 text-indigo-200 border border-indigo-400/30"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1">
          {activeTab === "profile" && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Profile Information</h2>
              <div className="space-y-4">
                <div><Label>Full Name</Label><Input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
                <Button variant="gradient" onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
              </div>
            </Card>
          )}
          {activeTab === "security" && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Change Password</h2>
              <div className="space-y-4">
                <div><Label>Current Password</Label><Input type="password" value={passwords.old} onChange={(e) => setPasswords({ ...passwords, old: e.target.value })} /></div>
                <div><Label>New Password</Label><Input type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} /></div>
                <div><Label>Confirm New Password</Label><Input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} /></div>
                <Button variant="gradient" onClick={savePassword} disabled={saving}>{saving ? "Updating..." : "Update Password"}</Button>
              </div>
            </Card>
          )}
          {activeTab === "system" && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">System Settings</h2>
              {loading ? <Skeleton className="h-64 w-full" /> : (
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-[var(--border-subtle)]"><span className="text-[var(--text-secondary)]">AI Provider</span><span className="text-[var(--text-primary)]">{settings?.aiProvider ?? "offline-engine"}</span></div>
                  <div className="flex justify-between py-2 border-b border-[var(--border-subtle)]"><span className="text-[var(--text-secondary)]">Database</span><span className="text-[var(--text-primary)]">{settings?.database ?? "SQLite"}</span></div>
                  <div className="flex justify-between py-2"><span className="text-[var(--text-secondary)]">App Version</span><span className="text-[var(--text-primary)]">{settings?.appVersion ?? "2026.1.0"}</span></div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
