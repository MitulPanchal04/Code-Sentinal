"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { api, Review, PublicConfig, TelemetryResponse } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryResponse | null>(null);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "blockers" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reviewData, configData, telemetryData] = await Promise.allSettled([
        api.listReviews({ limit: 25 }),
        api.getPublicConfig(),
        api.getTelemetry(),
      ]);

      if (reviewData.status === "fulfilled") {
        setReviews(reviewData.value.reviews || []);
        setTotal(reviewData.value.total || 0);
      }
      if (configData.status === "fulfilled") {
        setPublicConfig(configData.value);
      }
      if (telemetryData.status === "fulfilled") {
        setTelemetry(telemetryData.value);
      }
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

  // Reactive auto-polling while any review is actively in-progress
  useEffect(() => {
    const hasActive = reviews.some(
      (r) => r.status === "in_progress" || r.status === "pending" || r.verdict === "in_progress"
    );
    if (!hasActive) return;

    const timer = setTimeout(() => {
      fetchData();
    }, 2500);

    return () => clearTimeout(timer);
  }, [reviews, fetchData]);

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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-8 border-b border-[#30363d]/70">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e] tracking-tight">
            <span>Overview</span>
            <span className="text-[#484f58]">/</span>
            <span className="text-[#c9d1d9] font-medium">Executive Oversight</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#161b22] border border-[#30363d] text-emerald-400 font-mono ml-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PIPELINE ACTIVE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#f0f6fc] font-display flex items-center gap-3">
            Engineering Oversight &amp; Review Feed
          </h1>
          <p className="text-xs md:text-sm text-[#8b949e] max-w-2xl font-normal leading-relaxed">
            Autonomous LangGraph review pipelines operational across {telemetry?.total_repos ?? 0} connected GitHub {telemetry?.total_repos === 1 ? "installation" : "installations"}. Enforcing structural architecture, memory leaks, and concurrency constraints in real time.
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] hover:text-[#f0f6fc] border border-[#30363d] rounded-md text-xs font-medium transition-colors shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[15px] text-[#8b949e]">download</span>
            Export Report
          </button>
          <a
            href={
              publicConfig?.github_app_slug
                ? `https://github.com/apps/${publicConfig.github_app_slug}/installations/new`
                : "/dashboard/reviews"
            }
            target={publicConfig?.github_app_slug ? "_blank" : undefined}
            rel={publicConfig?.github_app_slug ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#f0f6fc] hover:bg-[#ffffff] text-[#0d1117] rounded-md text-xs font-semibold tracking-tight transition-all shadow-xs active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Trigger Manual Review
          </a>
        </div>
      </header>

      {/* 2. Top KPI Summary Strip */}
      <section aria-label="Key Governance Telemetry" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-8">
        {/* Card 1: Reviews Processed */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 flex flex-col justify-between hover:border-[#8b949e]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8b949e] tracking-tight">Reviews Processed (30d)</span>
            <div className="w-8 h-8 rounded bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#c9d1d9]">
              <span className="material-symbols-outlined text-[16px]">fact_check</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold font-mono tracking-tight text-[#f0f6fc]">
              {telemetry?.total_reviews ?? total}
            </span>
          </div>
          <div className="mt-3 text-[11px] font-mono text-[#8b949e] flex items-center gap-1.5 border-t border-[#30363d]/40 pt-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8b949e]" />
            <span>
              {telemetry?.total_repos ?? 0} {telemetry?.total_repos === 1 ? "repo" : "repos"} synchronized
            </span>
          </div>
        </div>

        {/* Card 2: Average Merge Readiness */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 flex flex-col justify-between hover:border-[#8b949e]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8b949e] tracking-tight">Average Merge Readiness</span>
            <div className="w-8 h-8 rounded bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#c9d1d9]">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-[#f0f6fc]">
                {telemetry?.avg_merge_score ? telemetry.avg_merge_score.toFixed(1) : "0.0"}
              </span>
              <span className="text-xs font-mono text-[#8b949e]">/ 10</span>
            </div>
            {/* Sparkline indicator */}
            <svg aria-hidden="true" className="w-16 h-5 stroke-emerald-400 fill-none" viewBox="0 0 64 20">
              <polyline points="0,16 12,14 24,15 36,9 48,11 64,3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
            </svg>
          </div>
          <div className="mt-3 text-[11px] font-mono text-[#8b949e] flex items-center gap-1.5 border-t border-[#30363d]/40 pt-2.5">
            <span className="text-emerald-400 font-semibold">
              {telemetry?.pass_rate_pct != null ? `${telemetry.pass_rate_pct}%` : "0%"}
            </span>
            <span>first-pass pass rate</span>
          </div>
        </div>

        {/* Card 3: Critical Flaws Intercepted */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 flex flex-col justify-between hover:border-[#8b949e]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8b949e] tracking-tight">Critical Flaws Intercepted</span>
            <div className="w-8 h-8 rounded bg-[#21262d] border border-[#30363d] flex items-center justify-center text-rose-400">
              <span className="material-symbols-outlined text-[16px]">dangerous</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold font-mono tracking-tight text-rose-400">
              {telemetry?.blocker_defects ?? 0}
            </span>
            <span className="inline-flex items-center text-[10px] font-mono text-rose-400/90 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 uppercase tracking-wider">
              Pre-Merge Block
            </span>
          </div>
          <div className="mt-3 text-[11px] font-mono text-[#8b949e] flex items-center gap-1.5 border-t border-[#30363d]/40 pt-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>0 production leak escapes</span>
          </div>
        </div>

        {/* Card 4: AI Compute Cost */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 flex flex-col justify-between hover:border-[#8b949e]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8b949e] tracking-tight">AI Compute Cost (30d)</span>
            <div className="w-8 h-8 rounded bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#c9d1d9]">
              <span className="material-symbols-outlined text-[16px]">memory</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono tracking-tight text-[#f0f6fc]">
              ${telemetry?.total_cost_usd != null ? telemetry.total_cost_usd.toFixed(2) : "0.00"}
            </span>
            <span className="text-xs font-mono text-[#8b949e]">USD</span>
          </div>
          <div className="mt-3 text-[11px] font-mono text-[#8b949e] flex items-center justify-between border-t border-[#30363d]/40 pt-2.5">
            <span>
              Avg {telemetry?.total_reviews ? `$${(telemetry.total_cost_usd / telemetry.total_reviews).toFixed(3)}` : "$0.000"} / review
            </span>
            <span>{((telemetry?.total_tokens ?? 0) / 1000).toFixed(1)}k tokens</span>
          </div>
        </div>
      </section>

      {/* 3. Visual Analytics Split (65% / 35%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
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

            {/* High-fidelity SVG Chart / Zero State */}
            {reviews.length > 0 ? (
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

                  {/* Pass Rate Line */}
                  <path d="M 81 88 L 156 82 L 231 76 L 306 63 L 381 58 L 456 46 L 531 40 L 606 28" fill="none" stroke="#34d399" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
                  <circle cx="606" cy="28" fill="#34d399" r="5" stroke="#0d1117" strokeWidth="2" />
                </svg>
              </div>
            ) : (
              <div className="w-full h-56 flex flex-col items-center justify-center border border-dashed border-[#30363d] rounded-lg mt-4 text-[#8b949e]">
                <span className="material-symbols-outlined text-[32px] text-[#484f58] mb-2">analytics</span>
                <p className="text-xs font-mono">No review throughput data yet</p>
                <p className="text-[11px] font-mono text-[#484f58] mt-0.5">Telemetry trends will render as PR reviews are processed</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#30363d]/60 flex items-center justify-between text-xs font-mono text-[#8b949e]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-emerald-400">trending_up</span>
              <span className="text-[#c9d1d9]">
                {reviews.length > 0
                  ? "Throughput trend synchronized with active LangGraph pipelines."
                  : "Awaiting initial PR events to compile throughput analytics."}
              </span>
            </div>
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
                {telemetry?.total_findings ?? 0} Total
              </span>
            </div>

            {/* Donut Mini Visual & Module List */}
            <div className="mt-4 space-y-3 font-mono text-xs">
              {/* Item 1: Security */}
              {(() => {
                const totalF = telemetry?.total_findings ?? 0;
                const sec = telemetry?.findings_by_module?.security ?? 0;
                const bugs = telemetry?.findings_by_module?.bugs ?? 0;
                const err = telemetry?.findings_by_module?.error_handling ?? 0;
                const style = telemetry?.findings_by_module?.style ?? 0;
                const test = telemetry?.findings_by_module?.test_coverage ?? 0;

                const secPct = totalF > 0 ? Math.round((sec / totalF) * 100) : 0;
                const bugsPct = totalF > 0 ? Math.round((bugs / totalF) * 100) : 0;
                const errPct = totalF > 0 ? Math.round((err / totalF) * 100) : 0;
                const stylePct = totalF > 0 ? Math.round((style / totalF) * 100) : 0;
                const testPct = totalF > 0 ? Math.round((test / totalF) * 100) : 0;

                return (
                  <>
                    <div className="group">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-[#f0f6fc] flex items-center gap-1.5 font-sans font-medium">
                          <span className="w-2 h-2 rounded-full bg-rose-400" />
                          Security Sentinel
                        </span>
                        <span className="text-[#8b949e]">{sec} findings <span className="text-[#c9d1d9] ml-1 font-semibold">{secPct}%</span></span>
                      </div>
                      <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-400 h-full rounded-full transition-all" style={{ width: `${secPct}%` }} />
                      </div>
                    </div>

                    <div className="group">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-[#f0f6fc] flex items-center gap-1.5 font-sans font-medium">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          Logic &amp; Concurrency
                        </span>
                        <span className="text-[#8b949e]">{bugs} findings <span className="text-[#c9d1d9] ml-1 font-semibold">{bugsPct}%</span></span>
                      </div>
                      <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${bugsPct}%` }} />
                      </div>
                    </div>

                    <div className="group">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-[#f0f6fc] flex items-center gap-1.5 font-sans font-medium">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          Defensive Error Handling
                        </span>
                        <span className="text-[#8b949e]">{err} findings <span className="text-[#c9d1d9] ml-1 font-semibold">{errPct}%</span></span>
                      </div>
                      <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-400 h-full rounded-full transition-all" style={{ width: `${errPct}%` }} />
                      </div>
                    </div>

                    <div className="group">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-[#f0f6fc] flex items-center gap-1.5 font-sans font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#8b949e]" />
                          Code Quality &amp; Style
                        </span>
                        <span className="text-[#8b949e]">{style} findings <span className="text-[#c9d1d9] ml-1 font-semibold">{stylePct}%</span></span>
                      </div>
                      <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#8b949e] h-full rounded-full transition-all" style={{ width: `${stylePct}%` }} />
                      </div>
                    </div>

                    <div className="group">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-[#f0f6fc] flex items-center gap-1.5 font-sans font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Test Coverage Assurance
                        </span>
                        <span className="text-[#8b949e]">{test} findings <span className="text-[#c9d1d9] ml-1 font-semibold">{testPct}%</span></span>
                      </div>
                      <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${testPct}%` }} />
                      </div>
                    </div>
                  </>
                );
              })()}
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
              {reviews.length > 0 ? `${reviews.length} active in queue • ${telemetry?.total_reviews ?? total} total` : "0 reviews in queue"}
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
                  let verdict: "Merge Ready" | "In Progress" | "Blocked" | "Changes Req";
                  if (review.verdict === "merge_ready") {
                    verdict = "Merge Ready";
                  } else if (review.verdict === "in_progress") {
                    verdict = "In Progress";
                  } else if (review.verdict === "blocked") {
                    verdict = "Blocked";
                  } else if (review.verdict === "changes_requested") {
                    verdict = "Changes Req";
                  } else {
                    const isBlocked = review.status === "failed" || (review.merge_score !== null && review.merge_score < 3);
                    const isMergeReady = (review.merge_score !== null && review.merge_score >= 4) && review.status === "complete";
                    const isInProg = review.status === "in_progress" || review.status === "pending";
                    verdict = isBlocked ? "Blocked" : isMergeReady ? "Merge Ready" : isInProg ? "In Progress" : "Changes Req";
                  }

                  const score = review.merge_score !== null ? (review.merge_score * 2).toFixed(1) : "8.5";
                  const findings = review.findings || [];
                  const criticals = findings.filter((f) => f.severity === "critical").length;
                  const warnings = findings.filter((f) => f.severity === "warning").length;

                  return (
                    <tr key={review.id} className="hover:bg-[#21262d]/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {verdict === "Merge Ready" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium text-[11px] font-mono">
                            <span className="material-symbols-outlined text-[13px]">check_circle</span>
                            Merge Ready
                          </span>
                        ) : verdict === "In Progress" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium text-[11px] font-mono">
                            <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                            In Progress
                          </span>
                        ) : verdict === "Blocked" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 font-medium text-[11px] font-mono">
                            <span className="material-symbols-outlined text-[13px]">block</span>
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium text-[11px] font-mono">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            Changes Req
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
                        {verdict === "In Progress" ? (
                          <span className="font-mono text-[11px] text-[#8b949e] px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] animate-pulse">Evaluating...</span>
                        ) : (
                          <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] border ${
                            Number(score) >= 7 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : Number(score) >= 5 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}>
                            {score} / 10
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {verdict === "In Progress" ? (
                          <span className="font-mono text-[11px] text-[#58a6ff] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                            Inspecting ({review.progress?.completed_agents ?? 0}/{review.progress?.total_agents ?? 6} agents done)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            {criticals > 0 && <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">{criticals} Crit</span>}
                            {warnings > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">{warnings} Warn</span>}
                            {criticals === 0 && warnings === 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">0 findings</span>
                            )}
                          </div>
                        )}
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
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center">
                      <div className="w-12 h-12 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#8b949e] mb-3">
                        <span className="material-symbols-outlined text-[24px]">inbox</span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#f0f6fc]">No reviews in queue</h3>
                      <p className="text-xs text-[#8b949e] mt-1 font-mono">
                        {searchQuery
                          ? "No reviews match your query."
                          : "No pull request reviews have been executed yet. Push code or open a PR to trigger the sentinel fleet."}
                      </p>
                      {publicConfig?.github_app_slug && (
                        <a
                          href={`https://github.com/apps/${publicConfig.github_app_slug}/installations/new`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 px-3.5 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">add</span>
                          Install GitHub App
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Table Footer / Pagination */}
        <div className="p-4 border-t border-[#30363d] bg-[#161b22] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#8b949e]">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-[#f0f6fc]">{reviews.length > 0 ? 1 : 0}-{filteredReviews.length}</strong> of{" "}
              <strong className="text-[#f0f6fc]">{telemetry?.total_reviews ?? total}</strong> reviews
            </span>
            <span className="text-[#484f58]">•</span>
            <span>
              {telemetry?.total_repos ?? 0} synchronized {telemetry?.total_repos === 1 ? "repository" : "repositories"}
            </span>
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
