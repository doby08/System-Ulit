"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, User, Mail } from "lucide-react";
import { useState, useEffect } from "react";

export default function ProfilePage() {
  const [profile, setProfile] = useState({ fullName: "", email: "", username: "", role: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.user) {
          setProfile({
            fullName: d.data.user.fullName ?? "",
            email: d.data.user.email ?? "",
            username: d.data.user.username,
            role: d.data.user.role,
          });
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fullName: profile.fullName, email: profile.email }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Profile</h1>

      <Card className="p-6">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-3xl font-bold">
            {profile.fullName?.[0]?.toUpperCase() ?? profile.username[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{profile.fullName || profile.username}</h2>
            <p className="text-[var(--text-secondary)]">{profile.role}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input value={profile.username} disabled className="bg-[var(--bg-base)]" />
            </div>
            <div>
              <Label>Full Name</Label>
              <Input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
            </div>
            <div>
              <Label>Email Address</Label>
              <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Role</Label>
              <Input value={profile.role} disabled className="bg-[var(--bg-base)]" />
            </div>
            <div>
              <Label>Account Status</Label>
              <Input value="Active" disabled className="bg-[var(--bg-base)]" />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button variant="gradient" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
