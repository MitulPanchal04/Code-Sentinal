"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [userDropdown, setUserDropdown] = useState(false);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard", key: "dashboard" },
    { label: "Repositories", href: "/dashboard/repositories", icon: "folder_code", key: "repositories" },
    { label: "Pull Requests", href: "/dashboard/reviews", icon: "merge", key: "pull-requests", badge: "142" },
    { label: "Architectural Rules", href: "/dashboard/settings", icon: "schema", key: "architectural-rules" },
    { label: "AI Review Squads", href: "/dashboard/analytics", icon: "smart_toy", key: "ai-review-squads" },
    { label: "Audit Logs", href: "/dashboard/reviews", icon: "history_edu", key: "audit-logs" },
    { label: "Organization Settings", href: "/dashboard/settings", icon: "settings", key: "organization-settings" },
  ];

  const isCurrentActive = (item: typeof navItems[0]) => {
    if (item.key === "dashboard") return pathname === "/dashboard";
    if (item.key === "repositories") return pathname === "/dashboard/repositories";
    if (item.key === "pull-requests") return pathname === "/dashboard/reviews" || pathname.startsWith("/dashboard/reviews/");
    if (item.key === "ai-review-squads") return pathname === "/dashboard/analytics";
    if (item.key === "organization-settings" || item.key === "architectural-rules") return pathname === "/dashboard/settings";
    return false;
  };

  return (
    <div className="bg-[#0d1117] font-sans text-[#c9d1d9] antialiased min-h-screen selection:bg-[#264f78] selection:text-white">
      {/* Fixed Left Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-[#0d1117] border-r border-[#30363d] z-50 flex flex-col justify-between py-3">
        <div className="flex flex-col gap-3">
          {/* Logo Header */}
          <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2 border-b border-[#30363d]/50 pb-3">
            <div className="h-7 w-7 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[#58a6ff]">
              <span className="material-symbols-outlined text-[18px]">shield</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[14px] text-[#f0f6fc] tracking-tight leading-none">CodeSentinel</span>
              <span className="text-[10px] text-[#8b949e] font-mono tracking-wider mt-0.5">POLICY ENGINE</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-col px-2.5 gap-0.5">
            {navItems.map((item) => {
              const active = isCurrentActive(item);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-colors text-[13px] font-medium ${
                    active
                      ? "bg-[#21262d] text-[#f0f6fc] border border-[#30363d] shadow-xs"
                      : "text-[#8b949e] hover:bg-[#161b22] hover:text-[#f0f6fc]"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${active ? "text-[#58a6ff]" : ""}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        active
                          ? "bg-[#30363d] text-[#c9d1d9]"
                          : "bg-[#161b22] text-[#8b949e]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Badge */}
        <div className="px-3 flex flex-col gap-2">
          <div className="flex items-center justify-between px-3 py-2 rounded-md bg-[#161b22] border border-[#30363d]">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-[11px] text-[#8b949e]">v2.4.0-gov</span>
            </div>
            <span className="material-symbols-outlined text-[15px] text-[#8b949e]">verified</span>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="pl-64">
        {/* Fixed Top Bar */}
        <header className="fixed top-0 left-64 right-0 h-14 bg-[#0d1117]/95 backdrop-blur-md border-b border-[#30363d] z-40 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[#8b949e] font-mono text-[12px]">
              <span className="material-symbols-outlined text-[16px] text-[#8b949e]">corporate_fare</span>
              <span className="text-[#f0f6fc] font-sans font-semibold text-[13px]">CodeSentinel Enterprise</span>
              <span className="text-[#484f58]">/</span>
              <span className="text-[#8b949e]">platform-governance</span>
              <span className="text-[#484f58]">/</span>
              <span className="text-[#c9d1d9] font-medium">production</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#161b22] border border-[#30363d] rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-[10px] text-[#8b949e] tracking-wider uppercase">US-EAST</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              className="flex items-center gap-2 px-2.5 py-1 bg-[#161b22] border border-[#30363d] hover:border-[#8b949e] rounded-md text-[#8b949e] hover:text-[#f0f6fc] transition-colors text-[12px] cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">search</span>
              <span className="font-mono text-[11px]">⌘K</span>
            </button>
            <button
              className="p-1.5 rounded-md text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc] transition-colors relative cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-blue-400 rounded-full" />
            </button>

            {/* Profile Avatar & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="w-7 h-7 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#c9d1d9] hover:border-[#8b949e] transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
              </button>

              {userDropdown && (
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-[#161b22] border border-[#30363d] shadow-xl py-1 text-xs z-50">
                  <div className="px-3 py-2 border-b border-[#30363d]">
                    <div className="font-semibold text-white truncate">{session?.user?.name || "Admin Developer"}</div>
                    <div className="text-[11px] text-[#8b949e] truncate">{session?.user?.email || "developer@codesentinel.io"}</div>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setUserDropdown(false)}
                    className="block px-3 py-1.5 text-[#c9d1d9] hover:bg-[#21262d] hover:text-white"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/signin" })}
                    className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/10"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="w-full pt-16 px-8 md:px-10 lg:px-12 bg-[#0d1117] min-h-screen">
          <div className="flex flex-col w-full max-w-[1550px] mx-auto pb-16">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
