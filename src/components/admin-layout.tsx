"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SIDEBAR_NAV, SIDEBAR_SECONDARY_NAV } from "@/lib/constants";
import {
  LayoutDashboard,
  Sparkles,
  ClipboardList,
  Library,
  Users,
  BarChart3,
  FileText,
  QrCode,
  RefreshCw,
  Settings,
  LifeBuoy,
  Menu,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Plus,
  Activity,
  CircleDot,
} from "lucide-react";
import { NetworkStatusIndicator } from "@/components/ui/network-status";
import { logout } from "@/lib/client/hooks";
import { useState } from "react";
import { useAuthContext } from "@/components/providers";
import Image from "next/image";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Sparkles,
  ClipboardList,
  Library,
  Users,
  BarChart3,
  FileText,
  QrCode,
  RefreshCw,
  Settings,
  LifeBuoy,
  Plus,
  Activity,
  CircleDot,
};

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-screen bg-[#05070F] overflow-hidden relative">
      {/* Ambient page glow — subtle, non-interactive */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-32 left-1/4 h-72 w-[36rem] rounded-full bg-[#3B6BF6]/10 blur-[110px]" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-[#22D3EE]/10 blur-[110px]" />
      </div>
      <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className={`relative z-10 flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <Header
          onOpenMobile={() => setMobileOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
          search={search}
          onSearchChange={setSearch}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ collapsed, mobileOpen, setMobileOpen }: {
  collapsed: boolean;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-[rgba(99,102,241,0.14)] bg-[#0A0F20]/95 backdrop-blur-xl transition-all duration-300",
          collapsed ? "w-20" : "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Image src="/wpu-campus.jpg" alt="" fill className="object-cover opacity-[0.08]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F20]/60 via-[#0A0F20]/85 to-[#0A0F20]" />
        </div>
        <div className="relative h-full flex flex-col">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-4 py-5 border-b border-[rgba(99,102,241,0.12)]">
            <Link href="/admin" className="flex items-center gap-3 flex-1 min-w-0" onClick={() => setMobileOpen(false)}>
              <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-amber-300/50 ring-offset-2 ring-offset-[#0A0F20] bg-[#0A0F20]">
                <Image
                  src="/wpu-logo.jpg"
                  alt="WPU AI Assistance Interview System logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="flex flex-col min-w-0">
                  <span className="text-[15px] font-bold text-white leading-tight truncate">
                    AI Interview & Survey
                  </span>
                  <span className="text-[11px] text-[#8FB0FF] leading-tight">
                    Western Philippines University
                  </span>
                  <span className="text-[10px] text-[#64748b] tracking-wider uppercase">
                    Aborlan, Palawan
                  </span>
                </div>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-thin" aria-label="Primary">
            <div className="px-2 mb-2">
              {(!collapsed || mobileOpen) && (
                <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748b] uppercase px-2">
                  Navigation
                </p>
              )}
            </div>
            <div className="space-y-1">
            {SIDEBAR_NAV.map((item) => {
              const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP] ?? LayoutDashboard;
              const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                    collapsed && !mobileOpen ? "justify-center" : "",
                    active
                      ? "bg-gradient-to-r from-[#2A4FE0] to-[#3B6BF6] text-white shadow-[0_10px_28px_-12px_rgba(59,107,246,0.8)]"
                      : "text-[#94a3b8] hover:bg-white/5 hover:text-white",
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {(!collapsed || mobileOpen) && (
                    <span className="truncate">
                      {item.label}
                    </span>
                  )}
                  {active && (!collapsed || mobileOpen) && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                  )}
                </Link>
              );
            })}
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="mt-4 px-2">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748b] uppercase px-2 mb-2">
                  Support
                </p>
                <div className="space-y-1">
                  {SIDEBAR_SECONDARY_NAV.map((item) => {
                    const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP] ?? LifeBuoy;
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all",
                          active ? "text-white bg-white/10" : "text-[#7d8aa5] hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {(!collapsed || mobileOpen) && (
              <div className="mt-4 mx-1 overflow-hidden rounded-2xl border border-white/10">
                <div className="relative h-24">
                  <Image src="/wpu-campus.jpg" alt="WPU Main Campus, Aborlan" fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05070F] via-[#05070F]/45 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="font-display text-lg italic text-white leading-none">WPU</p>
                    <p className="text-[10px] text-slate-300">Aborlan, Palawan</p>
                  </div>
                </div>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="border-t border-[rgba(99,102,241,0.12)] p-3">
            <div className="px-3 mb-2">
              {(!collapsed || mobileOpen) && (
                <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748b] uppercase px-2">
                  Account
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#94a3b8] hover:bg-white/5 hover:text-[#FB7185] transition-all",
                collapsed && !mobileOpen && "justify-center"
              )}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {(!collapsed || mobileOpen) && <span>Logout</span>}
            </button>
            {(!collapsed || mobileOpen) && (
              <div className="mt-3 px-3 py-2 rounded-xl bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.12)]">
                <p className="text-[10px] text-[#64748b] uppercase tracking-wider">System v2026.1.0</p>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">AI Interview & Survey</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function Header({ onOpenMobile, onToggleSidebar, sidebarCollapsed, search, onSearchChange }: { onOpenMobile: () => void; onToggleSidebar: () => void; sidebarCollapsed: boolean; search: string; onSearchChange: (v: string) => void }) {
  const { user } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  const activeLabel = [...SIDEBAR_NAV, ...SIDEBAR_SECONDARY_NAV].find((i) => i.href === "/admin" ? pathname === "/admin" : pathname === i.href || pathname.startsWith(i.href + "/"))?.label ?? "Dashboard";

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/admin/surveys?search=${encodeURIComponent(q)}` : "/admin/surveys");
  };

  return (
    <header className="sticky top-0 z-20 flex-shrink-0 border-b border-[rgba(99,102,241,0.12)] bg-[#05070F]/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
        <button
          onClick={onOpenMobile}
          aria-label="Open navigation"
          className="lg:hidden p-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/10"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/10 transition-all"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <div className="hidden md:block min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">{activeLabel}</h1>
          <p className="text-[11px] text-[#64748b]">AI Interview & Survey System · WPU</p>
        </div>
        <form onSubmit={submitSearch} className="relative hidden sm:block w-full max-w-md mx-auto" role="search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search interviews, surveys, or respondents…"
            aria-label="Search interviews, surveys, or respondents"
            className="w-full rounded-full border border-white/10 bg-[#0A0F20]/80 py-2 pl-9 pr-9 text-[13px] text-slate-200 placeholder:text-[#5b6a8a] outline-none transition focus:border-[#5C88FB]/60 focus:ring-2 focus:ring-[#3B6BF6]/25"
          />
          {search && (
            <button type="button" onClick={() => onSearchChange("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <NetworkStatusIndicator />
          <button aria-label="Notifications" className="relative p-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/10 transition-all">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FB7185] rounded-full shadow-[0_0_8px_#FB7185]" />
          </button>
          <Link href="/admin/profile" className="flex items-center gap-3 pl-3 border-l border-[rgba(99,102,241,0.12)]" title="Administrator profile">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5C88FB] to-[#22D3EE] flex items-center justify-center text-sm font-bold text-white shadow-lg ring-2 ring-[#0A0F20]">
              {user?.fullName?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="hidden xl:block">
              <p className="text-sm font-medium text-white leading-tight">{user?.fullName ?? user?.username ?? "Administrator"}</p>
              <p className="text-[11px] text-[#64748b]">{(user?.username ?? "admin").toLowerCase()}</p>
            </div>
          </Link>
        </div>
      </div>
      <form onSubmit={submitSearch} className="relative sm:hidden px-4 pb-3" role="search">
        <Search className="absolute left-7 top-1/2 -translate-y-[calc(50%+6px)] w-4 h-4 text-[#64748b]" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search interviews, surveys, or respondents…"
          aria-label="Search interviews, surveys, or respondents"
          className="w-full rounded-full border border-white/10 bg-[#0A0F20]/80 py-2 pl-9 pr-4 text-[13px] text-slate-200 placeholder:text-[#5b6a8a] outline-none focus:border-[#5C88FB]/60"
        />
      </form>
    </header>
  );
}

