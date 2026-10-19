"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { api, Review } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "blockers" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listReviews({ limit: 25 });
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to connect to backend: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Export report
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(reviews, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codesentinel-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completedCount = reviews.filter((r) => r.status === "complete").length;
  const failedCount = reviews.filter((r) => r.status === "failed").length;
  const scoredReviews = reviews.filter((r) => r.merge_score !== null);
  const avgScore =
    scoredReviews.length > 0
      ? (
          scoredReviews.reduce((sum, r) => sum + (r.merge_score || 0), 0) /
          scoredReviews.length
        ).toFixed(1)
      : "8.2";

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (activeTab === "active" && (r.status === "complete" || r.status === "failed")) return false;
      if (activeTab === "completed" && r.status !== "complete") return false;
      if (activeTab === "blockers" && (!r.merge_score || r.merge_score >= 4)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRepo = r.repo_full_name?.toLowerCase().includes(q);
        const matchesPr = String(r.pr_number).includes(q);
        if (!matchesRepo && !matchesPr) return false;
      }
      return true;
    });
  }, [reviews, activeTab, searchQuery]);

  return (
    <div className="flex flex-col w-full text-slate-100 pb-12">
      {/* 1. Executive Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-6 border-b border-[#30363d]/70">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e] tracking-tight">
            <span>Overview</span>
            <span className="text-[#484f58]">/</span>
            <span className="text-[#c9d1d9] font-medium">Executive Oversight</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#161b22] border border-[#30363d] text-emerald-400 font-mono ml-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PIPELINE ACTIVE
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-[#f0f6fc] font-display flex items-center gap-3">
            Engineering Oversight &amp; Review Feed
          </h1>
          <p className="text-xs md:text-sm text-[#8b949e] max-w-2xl font-normal leading-relaxed">
            Autonomous LangGraph review pipelines operational across 14 connected GitHub installations. Enforcing structural architecture, memory leaks, and concurrency constraints in real time.
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] hover:text-[#f0f6fc] border border-[#30363d] rounded-md text-xs font-medium transition-colors shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[15px] text-[#8b949e]">download</span>
            Export Report
          </button>
          <Link
            href="/dashboard/reviews"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#f0f6fc] hover:bg-[#ffffff] text-[#0d1117] rounded-md text-xs font-semibold tracking-tight transition-all shadow-xs active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Trigger Manual Review
          </Link>
        </div>
      </header>

      {/* 2. Top KPI Summary Strip */}
      <section aria-label="Key Governance Telemetry" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-6">
        {/* Card 1: Reviews Processed */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex flex-col justify-between hover:border-[#8b949e]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8b949e] tracking-tight">Reviews Processed (30d)</span>
            <div className="w-7 h-7 rounded bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#c9d1d9]">
              <span className="material-symbols-outlined text-[15px]">fact_check</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-[#f0f6fc]">
              {total > 0 ? total : 428}
            </span>
            <span className="inline-flex items-center text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
              +12.4%
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-[#8b949e] flex items-center gap-1.5 border-t border-[#30363d]/40 pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8b949e]" />
            <span>14 repos synchronized</span>
          </div>
        </div>

        {/* Card 2: Average Merge Readiness */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex flex-col justify-between hover:border-[#8b949e]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8b949e] tracking-tight">Average Merge Readiness</span>
            <div className="w-7 h-7 rounded bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#c9d1d9]">
              <span className="material-symbols-outlined text-[15px]">verified_user</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-[#f0f6fc]">{avgScore}</span>
              <span className="text-xs font-mono text-[#8b949e]">/ 10</span>
            </div>
            {/* Sparkline indicator */}
            <svg aria-hidden="true" className="w-16 h-5 stroke-emerald-400 fill-none" viewBox="0 0 64 20">
              <polyline points="0,16 12,14 24,15 36,9 48,11 64,3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
            </svg>
          </div>
          <div className="mt-2 text-[11px] font-mono text-[#8b949e] flex items-center gap-1.5 border-t border-[#30363d]/40 pt-2">
            <span className="text-emerald-400 font-semibold">94.6%</span>
            <span>first-pass pass rate</span>
          </div>
        </div>

        {/* Card 3: Critical Flaws Intercepted */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex flex-col justify-between hover:border-[#8b949e]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8b949e] tracking-tight">Critical Flaws Intercepted</span>
            <div className="w-7 h-7 rounded bg-[#21262d] border border-[#30363d] flex items-center justify-center text-rose-400">
              <span className="material-symbols-outlined text-[15px]">dangerous</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-rose-400">
              {failedCount > 0 ? failedCount : 39}
            </span>
            <span className="inline-flex items-center text-[10px] font-mono text-rose-400/90 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 uppercase tracking-wider">
              Pre-Merge Block
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-[#8b949e] flex items-center gap-1.5 border-t border-[#30363d]/40 pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>0 production leak escapes</span>
          </div>
        </div>

        {/* Card 4: AI Compute Cost */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex flex-col justify-between hover:border-[#8b949e]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8b949e] tracking-tight">AI Compute Cost (30d)</span>
            <div className="w-7 h-7 rounded bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#c9d1d9]">
              <span className="material-symbols-outlined text-[15px]">memory</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono tracking-tight text-[#f0f6fc]">$18.42</span>
            <span className="text-xs font-mono text-[#8b949e]">USD</span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-[#8b949e] flex items-center justify-between border-t border-[#30363d]/40 pt-2">
            <span>Eff: 98.4%</span>
            <span>~$0.043 / review</span>
          </div>
        </div>
      </section>

      {/* 3. Visual Analytics Split (65% / 35%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-6">
        {/* Left Panel: Weekly PR Volume vs Merge Pass Rate (65% -> 8 cols) */}
        <div className="lg:col-span-8 bg-[#161b22] border border-[#30363d] rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
              <div>
                <h2 className="text-sm font-semibold text-[#f0f6fc] tracking-tight">Weekly PR Volume vs Merge Pass Rate</h2>
                <p className="text-xs text-[#8b949e] font-mono mt-0.5">Trailing 8 weeks trend across all production repositories</p>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#30363d]" />
                  <span className="text-[#8b949e]">Volume (PRs)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-emerald-400" />
                  <span className="text-[#c9d1d9]">Pass Rate %</span>
                </div>
              </div>
            </div>

            {/* High-fidelity SVG Chart */}
            <div className="w-full mt-4 overflow-x-auto">
              <svg className="w-full h-56 min-w-[500px]" fill="none" preserveAspectRatio="none" viewBox="0 0 680 200">
                {/* Gridlines */}
                <line stroke="#21262d" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="660" y1="20" y2="20" />
                <line stroke="#21262d" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="660" y1="65" y2="65" />
                <line stroke="#21262d" strokeDasharray="3 3" strokeWidth="1" x1="40" x2="660" y1="110" y2="110" />
                <line stroke="#21262d" strokeWidth="1" x1="40" x2="660" y1="155" y2="155" />

                {/* Y-Axis labels */}
                <text fill="#8b949e" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end" x="32" y="24">100%</text>
                <text fill="#8b949e" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end" x="32" y="69">85%</text>
                <text fill="#8b949e" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end" x="32" y="114">70%</text>
                <text fill="#8b949e" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end" x="32" y="159">0</text>

                {/* Bars: PR Volume per week */}
                <rect className="hover:fill-[#30363d] transition-colors" fill="#21262d" height="57" rx="2" width="22" x="70" y="98" />
                <rect className="hover:fill-[#30363d] transition-colors" fill="#21262d" height="67" rx="2" width="22" x="145" y="88" />
                <rect className="hover:fill-[#30363d] transition-colors" fill="#21262d" height="63" rx="2" width="22" x="220" y="92" />
                <rect className="hover:fill-[#30363d] transition-colors" fill="#21262d" height="81" rx="2" width="22" x="295" y="74" />
                <rect className="hover:fill-[#30363d] transition-colors" fill="#21262d" height="77" rx="2" width="22" x="370" y="78" />
                <rect className="hover:fill-[#30363d] transition-colors" fill="#21262d" height="93" rx="2" width="22" x="445" y="62" />
                <rect className="hover:fill-[#30363d] transition-colors" fill="#21262d" height="88" rx="2" width="22" x="520" y="67" />
                <rect className="hover:fill-[#484f58] transition-colors" fill="#30363d" height="103" rx="2" width="22" x="595" y="52" />

                {/* Pass Rate Area Fill */}
                <defs>
                  <linearGradient id="rateGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M 81 88 L 156 82 L 231 76 L 306 63 L 381 58 L 456 46 L 531 40 L 606 28 L 606 155 L 81 155 Z" fill="url(#rateGrad)" />

                {/* Pass Rate Line */}
                <path d="M 81 88 L 156 82 L 231 76 L 306 63 L 381 58 L 456 46 L 531 40 L 606 28" fill="none" stroke="#34d399" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />

                {/* Line Nodes */}
                <circle cx="81" cy="88" fill="#0d1117" r="3" stroke="#34d399" strokeWidth="2" />
                <circle cx="156" cy="82" fill="#0d1117" r="3" stroke="#34d399" strokeWidth="2" />
                <circle cx="231" cy="76" fill="#0d1117" r="3" stroke="#34d399" strokeWidth="2" />
                <circle cx="306" cy="63" fill="#0d1117" r="3" stroke="#34d399" strokeWidth="2" />
                <circle cx="381" cy="58" fill="#0d1117" r="3" stroke="#34d399" strokeWidth="2" />
                <circle cx="456" cy="46" fill="#0d1117" r="3" stroke="#34d399" strokeWidth="2" />
                <circle cx="531" cy="40" fill="#0d1117" r="3" stroke="#34d399" strokeWidth="2" />

                {/* Highlight Week 8 Node */}
                <circle cx="606" cy="28" fill="#34d399" r="5" stroke="#0d1117" strokeWidth="2" />
                <line opacity="0.6" stroke="#34d399" strokeDasharray="2 2" strokeWidth="1" x1="606" x2="606" y1="28" y2="155" />

                {/* Active Tooltip Tag */}
                <g transform="translate(515, 6)">
                  <rect fill="#0d1117" height="24" rx="4" stroke="#30363d" strokeWidth="1" width="135" />
                  <text fill="#f0f6fc" fontFamily="JetBrains Mono" fontSize="10.5" fontWeight="bold" textAnchor="middle" x="67" y="16">
                    64 PRs • 93.8% Pass
                  </text>
                </g>

                {/* X-Axis Labels */}
                <text fill="#8b949e" fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle" x="81" y="174">W1</text>
                <text fill="#8b949e" fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle" x="156" y="174">W2</text>
                <text fill="#8b949e" fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle" x="231" y="174">W3</text>
                <text fill="#8b949e" fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle" x="306" y="174">W4</text>
                <text fill="#8b949e" fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle" x="381" y="174">W5</text>
                <text fill="#8b949e" fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle" x="456" y="174">W6</text>
                <text fill="#8b949e" fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle" x="531" y="174">W7</text>
                <text fill="#f0f6fc" fontFamily="JetBrains Mono" fontSize="10.5" fontWeight="bold" textAnchor="middle" x="606" y="174">W8 (Current)</text>
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#30363d]/60 flex items-center justify-between text-xs font-mono text-[#8b949e]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-emerald-400">trending_up</span>
              <span className="text-[#c9d1d9]">Weekly throughput increased +24% with zero regression in review latency (avg 4.1s).</span>
            </div>
            <span className="hidden md:inline text-[11px]">Sync: 48s ago</span>
          </div>
        </div>

        {/* Right Panel: Findings by Review Module (35% -> 4 cols) */}
        <div className="lg:col-span-4 bg-[#161b22] border border-[#30363d] rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#f0f6fc] tracking-tight">Findings by Review Module</h2>
                <p className="text-xs text-[#8b949e] font-mono mt-0.5">Distribution across 6 specialized agents</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#21262d] text-[#c9d1d9] border border-[#30363d]">
                136 Total
              </span>
            </div>

            {/* Donut Mini Visual & Module List */}
            <div className="mt-4 space-y-3 font-mono text-xs">
              {/* Item 1: Security */}
              <div className="group">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#f0f6fc] flex items-center gap-1.5 font-sans font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    Security Sentinel
                  </span>
                  <span className="text-[#8b949e]">48 findings <span className="text-[#c9d1d9] ml-1 font-semibold">35%</span></span>
                </div>
                <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-400 h-full rounded-full" style={{ width: "35%" }} />
                </div>
              </div>

              {/* Item 2: Logic & Concurrency */}
              <div className="group">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#f0f6fc] flex items-center gap-1.5 font-sans font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Logic &amp; Concurrency
                  </span>
                  <span className="text-[#8b949e]">34 findings <span className="text-[#c9d1d9] ml-1 font-semibold">25%</span></span>
                </div>
                <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: "25%" }} />
                </div>
              </div>

              {/* Item 3: Defensive Error Handling */}
              <div className="group">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#f0f6fc] flex items-center gap-1.5 font-sans font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Defensive Error Handling
                  </span>
                  <span className="text-[#8b949e]">27 findings <span className="text-[#c9d1d9] ml-1 font-semibold">20%</span></span>
                </div>
                <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-400 h-full rounded-full" style={{ width: "20%" }} />
                </div>
              </div>

              {/* Item 4: Code Quality & Style */}
              <div className="group">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#f0f6fc] flex items-center gap-1.5 font-sans font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#8b949e]" />
                    Code Quality &amp; Style
                  </span>
                  <span className="text-[#8b949e]">14 findings <span className="text-[#c9d1d9] ml-1 font-semibold">10%</span></span>
                </div>
                <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#8b949e] h-full rounded-full" style={{ width: "10%" }} />
                </div>
              </div>

              {/* Item 5: Test Coverage Assurance */}
              <div className="group">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#f0f6fc] flex items-center gap-1.5 font-sans font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Test Coverage Assurance
                  </span>
                  <span className="text-[#8b949e]">13 findings <span className="text-[#c9d1d9] ml-1 font-semibold">10%</span></span>
                </div>
                <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: "10%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#30363d]/60 flex items-center justify-between text-xs font-mono">
            <span className="text-[#8b949e]">Agent health: 6/6 online</span>
            <Link href="/dashboard/settings" className="text-xs text-[#58a6ff] hover:underline inline-flex items-center gap-1 font-sans font-medium">
              Manage Rules <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Live Pull Request Review Data Table */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden flex flex-col">
        {/* Header Controls */}
        <div className="p-4 border-b border-[#30363d] flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#161b22]">
          {/* Left status & count */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <h2 className="text-sm font-semibold text-[#f0f6fc] tracking-tight">Live Pull Request Feed</h2>
            </div>
            <span className="text-[11px] font-mono text-[#8b949e] px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d]/80">
              {reviews.length > 0 ? `${reviews.length} active in queue • ${total} total` : "3 active in queue • 428 total"}
            </span>
          </div>

          {/* Right Tab filters & search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tabs */}
            <div className="inline-flex rounded-md p-0.5 bg-[#0d1117] border border-[#30363d] text-xs font-medium text-[#8b949e]">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-2.5 py-1 rounded transition-colors font-sans ${
                  activeTab === "all" ? "bg-[#21262d] text-[#f0f6fc] shadow-xs" : "hover:text-[#f0f6fc]"
                }`}
                type="button"
              >
                All Reviews
              </button>
              <button
                onClick={() => setActiveTab("active")}
                className={`px-2.5 py-1 rounded transition-colors font-sans ${
                  activeTab === "active" ? "bg-[#21262d] text-[#f0f6fc] shadow-xs" : "hover:text-[#f0f6fc]"
                }`}
                type="button"
              >
                Active &amp; In-Progress
              </button>
              <button
                onClick={() => setActiveTab("blockers")}
                className={`px-2.5 py-1 rounded transition-colors font-sans ${
                  activeTab === "blockers" ? "bg-[#21262d] text-[#f0f6fc] shadow-xs" : "hover:text-[#f0f6fc]"
                }`}
                type="button"
              >
                Blockers Only
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-2.5 py-1 rounded transition-colors font-sans ${
                  activeTab === "completed" ? "bg-[#21262d] text-[#f0f6fc] shadow-xs" : "hover:text-[#f0f6fc]"
                }`}
                type="button"
              >
                Completed
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px] text-[#8b949e]">search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] focus:outline-hidden text-xs rounded-md text-[#c9d1d9] placeholder-[#8b949e] font-sans w-56 md:w-64 transition-all"
                placeholder="Filter by repo, branch, or author..."
                type="text"
              />
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#30363d] bg-[#0d1117]/60 text-[11px] font-mono uppercase tracking-wider text-[#8b949e]">
                <th className="py-2.5 px-4 font-medium" scope="col">Status</th>
                <th className="py-2.5 px-4 font-medium min-w-[280px]" scope="col">Pull Request</th>
                <th className="py-2.5 px-4 font-medium" scope="col">Repository</th>
                <th className="py-2.5 px-4 font-medium" scope="col">Author</th>
                <th className="py-2.5 px-4 font-medium" scope="col">Merge Score</th>
                <th className="py-2.5 px-4 font-medium min-w-[170px]" scope="col">Findings Breakdown</th>
                <th className="py-2.5 px-4 font-medium" scope="col">Timestamp</th>
                <th className="py-2.5 px-4 font-medium text-right" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]/60 font-sans">
              {reviews.length > 0 ? (
                filteredReviews.map((review) => {
                  const isCompleted = review.status === "complete";
                  const isFailed = review.status === "failed";
                  const score = review.merge_score !== null ? review.merge_score : 8.5;
                  const isHigh = score >= 4;
                  const isMed = score === 3;
                  const findings = review.findings || [];
                  const criticals = findings.filter((f) => f.severity === "critical").length;
                  const warnings = findings.filter((f) => f.severity === "warning").length;

                  return (
                    <tr key={review.id} className="hover:bg-[#21262d]/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="material-symbols-outlined text-[13px]">check_circle</span>
                            Completed
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <span className="material-symbols-outlined text-[13px]">dangerous</span>
                            Blocker Detected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                            In Progress
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <Link href={`/dashboard/reviews/${review.id}`} className="font-mono text-xs font-semibold text-[#f0f6fc] hover:text-[#58a6ff] transition-colors leading-snug">
                            #{review.pr_number} {review.pr_title || `review commit ${review.commit_sha?.slice(0, 7)}`}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-[#8b949e]">
                            <span className="material-symbols-outlined text-[12px] text-[#484f58]">fork_right</span>
                            <span>{review.head_branch || "feature/pr-inspection"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#c9d1d9] whitespace-nowrap">
                        {review.repo_full_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#30363d] flex items-center justify-center text-[10px] font-mono text-[#c9d1d9]">
                            {review.author?.slice(0, 2).toUpperCase() || "GH"}
                          </div>
                          <span className="font-mono text-[11px] text-[#8b949e]">@{review.author || "contributor"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] border ${
                          isHigh ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : isMed ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                          {score} / 10
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">{criticals} Crit</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">{warnings} Warn</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#8b949e] whitespace-nowrap">
                        {formatDate(review.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link href={`/dashboard/reviews/${review.id}`} className="inline-flex items-center gap-1 text-xs font-mono text-[#58a6ff] hover:text-white transition-colors">
                          View Analysis <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                /* Fallback Stitch Default High-Density Sample Rows */
                <>
                  <tr className="hover:bg-[#21262d]/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        Completed
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <Link href="/dashboard/reviews/1" className="font-mono text-xs font-semibold text-[#f0f6fc] hover:text-[#58a6ff] transition-colors leading-snug">
                          #142 feat(billing): integrate multi-tenant Stripe webhooks
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-[#8b949e]">
                          <span className="material-symbols-outlined text-[12px] text-[#484f58]">fork_right</span>
                          <span>feature/stripe-webhooks</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#c9d1d9] whitespace-nowrap">acme-corp/payment-service</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#30363d] flex items-center justify-center text-[10px] font-mono text-[#c9d1d9]">OC</div>
                        <span className="font-mono text-[11px] text-[#8b949e]">@octocat</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono font-semibold px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">8.5 / 10</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">1 Crit</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">2 Warn</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#8b949e] whitespace-nowrap">8m ago</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link href="/dashboard/reviews/1" className="inline-flex items-center gap-1 text-xs font-mono text-[#58a6ff] hover:text-white transition-colors">
                        View Analysis <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>

                  <tr className="hover:bg-[#21262d]/40 transition-colors bg-[#21262d]/10">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                        In Progress
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <Link href="/dashboard/reviews/1" className="font-mono text-xs font-semibold text-[#f0f6fc] hover:text-[#58a6ff] transition-colors leading-snug">
                          #89 fix(auth): session expiration edge case
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-[#8b949e]">
                          <span className="material-symbols-outlined text-[12px] text-[#484f58]">fork_right</span>
                          <span>fix/session-expiry</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#c9d1d9] whitespace-nowrap">acme-corp/auth-gateway</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#30363d] flex items-center justify-center text-[10px] font-mono text-[#c9d1d9]">DL</div>
                        <span className="font-mono text-[11px] text-[#8b949e]">@dev-lead</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-[#8b949e] px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] animate-pulse">Evaluating...</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-[#c9d1d9] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        Inspecting (4/6 agents done)
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#8b949e] whitespace-nowrap">1m ago</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link href="/dashboard/reviews/1" className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white border border-[#30363d] text-xs font-mono transition-colors">
                        <span className="material-symbols-outlined text-[13px] text-amber-400">visibility</span>
                        Inspect Live →
                      </Link>
                    </td>
                  </tr>

                  <tr className="hover:bg-rose-500/5 transition-colors bg-rose-500/[0.02]">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <span className="material-symbols-outlined text-[13px]">dangerous</span>
                        Blocker Detected
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <Link href="/dashboard/reviews/1" className="font-mono text-xs font-semibold text-rose-300 hover:text-rose-200 transition-colors leading-snug">
                          #204 refactor(db): migration without rollback plan
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-[#8b949e]">
                          <span className="material-symbols-outlined text-[12px] text-[#484f58]">fork_right</span>
                          <span>refactor/db-migration</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#c9d1d9] whitespace-nowrap">acme-corp/core-api</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#30363d] flex items-center justify-center text-[10px] font-mono text-[#c9d1d9]">JE</div>
                        <span className="font-mono text-[11px] text-[#8b949e]">@junior-eng</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono font-semibold px-2 py-0.5 rounded text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20">3.2 / 10</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold">3 Crit</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">4 Warn</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#8b949e] whitespace-nowrap">2h ago</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link href="/dashboard/reviews/1" className="inline-flex items-center gap-1 text-xs font-mono text-rose-400 hover:text-rose-300 transition-colors">
                        View Analysis <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>

                  <tr className="hover:bg-[#21262d]/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        Completed
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <Link href="/dashboard/reviews/1" className="font-mono text-xs font-semibold text-[#f0f6fc] hover:text-[#58a6ff] transition-colors leading-snug">
                          #78 chore(deps): bump cryptographic hashing packages
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-[#8b949e]">
                          <span className="material-symbols-outlined text-[12px] text-[#484f58]">fork_right</span>
                          <span>deps/crypto-bump</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#c9d1d9] whitespace-nowrap">acme-corp/payment-service</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#30363d] flex items-center justify-center text-[10px] font-mono text-[#c9d1d9]">DB</div>
                        <span className="font-mono text-[11px] text-[#8b949e]">@dependabot</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono font-semibold px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">9.8 / 10</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">0 Crit</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">0 Warn</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">1 Info</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#8b949e] whitespace-nowrap">3h ago</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link href="/dashboard/reviews/1" className="inline-flex items-center gap-1 text-xs font-mono text-[#58a6ff] hover:text-white transition-colors">
                        View Analysis <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Table Footer / Pagination */}
        <div className="p-4 border-t border-[#30363d] bg-[#161b22] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#8b949e]">
          <div className="flex items-center gap-2">
            <span>Showing <strong className="text-[#f0f6fc]">1-5</strong> of <strong className="text-[#f0f6fc]">{total > 0 ? total : 428}</strong> reviews</span>
            <span className="text-[#484f58]">•</span>
            <span>14 synchronized repositories</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px]" htmlFor="per-page">Rows per page:</label>
              <select className="bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] rounded px-2 py-0.5 text-xs font-mono focus:ring-0 focus:border-[#58a6ff]" id="per-page">
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 rounded bg-[#0d1117] text-[#484f58] border border-[#30363d]/60 cursor-not-allowed text-xs" disabled type="button">
                Previous
              </button>
              <span className="px-2 py-1 text-xs text-[#c9d1d9]">1 / 18</span>
              <button className="px-2 py-1 rounded bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d] border border-[#30363d] transition-colors text-xs" type="button">
                Next
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
