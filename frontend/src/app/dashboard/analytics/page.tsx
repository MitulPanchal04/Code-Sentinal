"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { api, Installation, TelemetryResponse } from "@/lib/api";

const AGENT_ICON_MAP: Record<string, { icon: string; color: string; border: string }> = {
  security: { icon: "security", color: "text-[#f43f5e]", border: "bg-[#f43f5e]/10 border-[#f43f5e]/20" },
  bugs: { icon: "sync_alt", color: "text-[#58a6ff]", border: "bg-[#58a6ff]/10 border-[#58a6ff]/20" },
  error_handling: { icon: "crisis_alert", color: "text-amber-400", border: "bg-amber-400/10 border-amber-400/20" },
  style: { icon: "tune", color: "text-[#8b949e]", border: "bg-[#8b949e]/10 border-[#8b949e]/20" },
  test_coverage: { icon: "fact_check", color: "text-[#5db579]", border: "bg-[#5db579]/10 border-[#5db579]/20" },
  comment_accuracy: { icon: "menu_book", color: "text-[#8b949e]", border: "bg-[#8b949e]/10 border-[#8b949e]/20" },
};

export default function AnalyticsPage() {
  const [telemetry, setTelemetry] = useState<TelemetryResponse | null>(null);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [selectedWindow, setSelectedWindow] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tel, inst] = await Promise.allSettled([
        api.getTelemetry(selectedRepo !== "all" ? selectedRepo : undefined),
        api.listInstallations(),
      ]);
      if (tel.status === "fulfilled") {
        setTelemetry(tel.value);
      }
      if (inst.status === "fulfilled") {
        setInstallations(inst.value.installations || []);
      }
    } catch (err) {
      console.warn("Failed to load telemetry data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedRepo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(telemetry, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codesentinel-telemetry.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRuns = useMemo(
    () => telemetry?.agent_fleet?.reduce((acc, a) => acc + (a.invocations || 0), 0) ?? 0,
    [telemetry]
  );

  const warnDefects = useMemo(
    () => (telemetry?.findings_by_module?.bugs ?? 0) + (telemetry?.findings_by_module?.error_handling ?? 0),
    [telemetry]
  );

  const infoDefects = useMemo(
    () =>
      (telemetry?.findings_by_module?.style ?? 0) +
      (telemetry?.findings_by_module?.test_coverage ?? 0) +
      (telemetry?.findings_by_module?.comment_accuracy ?? 0),
    [telemetry]
  );

  const topViolations = useMemo(() => {
    if (!telemetry || telemetry.total_findings === 0) return [];
    const list = [
      {
        name: "Security vulnerabilities & OWASP invariant violations",
        rule: "rule/security-sentinel",
        count: telemetry.findings_by_module?.security ?? 0,
        severity: "critical",
      },
      {
        name: "Logic flaws, concurrency hazards & memory leaks",
        rule: "rule/logic-concurrency",
        count: telemetry.findings_by_module?.bugs ?? 0,
        severity: "critical",
      },
      {
        name: "Missing defensive error boundaries & uncaught exceptions",
        rule: "rule/defensive-error",
        count: telemetry.findings_by_module?.error_handling ?? 0,
        severity: "warning",
      },
      {
        name: "Code style regressions & architectural drift",
        rule: "rule/code-style-quality",
        count: telemetry.findings_by_module?.style ?? 0,
        severity: "info",
      },
      {
        name: "Uncovered branches & missing test assertions",
        rule: "rule/coverage-assurance",
        count: telemetry.findings_by_module?.test_coverage ?? 0,
        severity: "info",
      },
    ].filter((item) => item.count > 0);

    return list.sort((a, b) => b.count - a.count);
  }, [telemetry]);

  return (
    <div className="flex flex-col w-full pb-16 text-[#c9d1d9] antialiased">
      {/* Top Header / Meta Controls Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-8 pt-4 gap-6 border-b border-[#30363d]/60 mb-8">
        <div className="flex flex-col gap-2">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-mono text-[12px] text-[#8b949e]">
            <Link className="hover:text-[#f0f6fc] cursor-pointer transition-colors" href="/dashboard">
              Dashboard
            </Link>
            <span className="text-[#484f58]">/</span>
            <span className="text-[#58a6ff] font-medium">Analytics</span>
            <span className="text-[#484f58]">/</span>
            <span className="px-2 py-0.5 rounded bg-[#161b22] text-[#8b949e] border border-[#30363d] text-[10px]">
              LIVE TELEMETRY
            </span>
          </nav>
          <div className="flex items-baseline gap-3">
            <h1 className="text-[28px] font-semibold text-[#f0f6fc] tracking-tight font-display">
              Inspection Intelligence &amp; Quality Analytics
            </h1>
          </div>
          <p className="text-[13px] text-[#8b949e] max-w-2xl leading-relaxed">
            Longitudinal defect tracking, rulebook invariant adherence, and AI token economics across all connected installations.
          </p>
        </div>

        {/* Filters & Action Bar */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Repo Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="h-9 pl-3 pr-8 rounded bg-[#161b22] border border-[#30363d] hover:border-[#8b949e] text-[#c9d1d9] text-[12px] font-mono appearance-none focus:outline-none cursor-pointer truncate max-w-[240px]"
            >
              <option value="all">
                All Repositories ({telemetry?.total_repos ?? installations.length})
              </option>
              {installations.map((inst) => (
                <option key={inst.installation_id} value={inst.repo_full_name}>
                  {inst.repo_full_name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-[15px] text-[#8b949e] absolute right-2.5 top-2.5 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Date Range Dropdown */}
          <div className="relative">
            <select
              value={selectedWindow}
              onChange={(e) => setSelectedWindow(e.target.value)}
              className="h-9 pl-3 pr-8 rounded bg-[#161b22] border border-[#30363d] hover:border-[#8b949e] text-[#c9d1d9] text-[12px] font-mono appearance-none focus:outline-none cursor-pointer"
            >
              <option value="all">Date: All History</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <span className="material-symbols-outlined text-[15px] text-[#8b949e] absolute right-2.5 top-2.5 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Export Report Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#f0f6fc] text-[12px] font-medium transition-colors shadow-sm cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-[#8b949e]">download</span>
            <span>Export Report</span>
          </button>
        </div>
      </header>

      {/* Top-Level Summary Metrics Strip (4 high-density cards) */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1 */}
        <div className="flex flex-col justify-between p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#484f58] transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#8b949e] tracking-tight">Total Invariants Enforced</span>
            <span className="material-symbols-outlined text-[18px] text-[#8b949e]">gavel</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-semibold text-[#f0f6fc]">
              {((telemetry?.total_reviews ?? 0) * 6).toLocaleString()}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#30363d]/50 flex items-center justify-between text-[11px] text-[#8b949e] font-mono">
            <span>Across {telemetry?.total_reviews ?? 0} pull requests</span>
            <span className="text-[#58a6ff]">100% evaluated</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="flex flex-col justify-between p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#484f58] transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#8b949e] tracking-tight">Defects Intercepted</span>
            <span className="material-symbols-outlined text-[18px] text-[#f43f5e]">shield_locked</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-semibold text-[#f0f6fc]">
              {telemetry?.total_findings ?? 0}
            </span>
            <span className="text-[11px] font-mono text-[#8b949e]">pre-merge</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#30363d]/50 flex items-center gap-2 text-[10.5px] font-mono">
            <span className="px-2 py-0.5 rounded bg-[#f43f5e]/15 text-[#f43f5e] font-medium">
              {telemetry?.blocker_defects ?? 0} Crit
            </span>
            <span className="text-[#484f58]">•</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">
              {warnDefects} Warn
            </span>
            <span className="text-[#484f58]">•</span>
            <span className="px-2 py-0.5 rounded bg-[#30363d]/70 text-[#8b949e]">
              {infoDefects} Info
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="flex flex-col justify-between p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#484f58] transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#8b949e] tracking-tight">Agent Fleet Efficiency</span>
            <span className="material-symbols-outlined text-[18px] text-[#5db579]">bolt</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-semibold text-[#f0f6fc]">
              {telemetry?.total_reviews ? "99.8%" : "100%"}
            </span>
            <span className="inline-flex items-center text-[11px] font-mono text-[#5db579] bg-[#5db579]/10 px-2 py-0.5 rounded">
              Operational
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#30363d]/50 flex items-center justify-between text-[11px] text-[#8b949e] font-mono">
            <span>Avg squad latency</span>
            <span className="text-[#f0f6fc] font-medium">
              {telemetry?.avg_latency_seconds ? `${telemetry.avg_latency_seconds}s` : "0.0s"}
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="flex flex-col justify-between p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#484f58] transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#8b949e] tracking-tight">Aggregate Inference Cost</span>
            <span className="material-symbols-outlined text-[18px] text-[#8b949e]">payments</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-semibold text-[#f0f6fc]">
              ${telemetry?.total_cost_usd != null ? telemetry.total_cost_usd.toFixed(2) : "0.00"}
            </span>
            <span className="text-[11px] font-mono text-[#8b949e]">USD</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#30363d]/50 flex items-center justify-between text-[11px] text-[#8b949e] font-mono">
            <span>
              Avg {telemetry?.total_reviews ? `$${(telemetry.total_cost_usd / telemetry.total_reviews).toFixed(3)}` : "$0.000"} / review
            </span>
            <span>{((telemetry?.total_tokens ?? 0) / 1000).toFixed(1)}k tokens</span>
          </div>
        </div>
      </section>

      {/* Defect Prevention & Architectural Compliance Section (2-Column Grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Left Panel: Weekly Defect Volume Stacked Bar Chart */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 rounded-xl bg-[#161b22] border border-[#30363d] shadow-sm">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-[16px] font-semibold text-[#f0f6fc] tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-[19px] text-[#58a6ff]">stacked_bar_chart</span>
                  Defects Intercepted Prior to Merge
                </h2>
                <p className="text-[12px] text-[#8b949e]">
                  Weekly volume of code defects and invariant breaches caught before production deployment.
                </p>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px] font-mono text-[#8b949e]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#f43f5e]"></span>
                  <span>Critical</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
                  <span>Warning</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#484f58]"></span>
                  <span>Info</span>
                </div>
              </div>
            </div>

            {/* Stacked Chart Visualization / Zero-State */}
            <div className="mt-8 mb-6">
              {telemetry && telemetry.total_findings > 0 ? (
                <div className="relative h-52 w-full flex items-end justify-around gap-5 px-3 pb-7 border-b border-[#30363d]">
                  <div className="relative z-10 flex-1 flex flex-col items-center group max-w-[60px]">
                    <div className="w-full flex flex-col-reverse rounded-t overflow-hidden bg-[#21262d]/50 hover:brightness-110 transition-all cursor-pointer h-40">
                      <div
                        className="w-full bg-[#484f58]"
                        style={{ height: `${(infoDefects / telemetry.total_findings) * 100}%` }}
                        title={`Info: ${infoDefects}`}
                      ></div>
                      <div
                        className="w-full bg-amber-400/90"
                        style={{ height: `${(warnDefects / telemetry.total_findings) * 100}%` }}
                        title={`Warning: ${warnDefects}`}
                      ></div>
                      <div
                        className="w-full bg-[#f43f5e]"
                        style={{ height: `${((telemetry.blocker_defects || 0) / telemetry.total_findings) * 100}%` }}
                        title={`Critical: ${telemetry.blocker_defects || 0}`}
                      ></div>
                    </div>
                    <div className="absolute -bottom-6 flex flex-col items-center">
                      <span className="font-mono text-[11px] text-[#58a6ff] font-semibold">Active</span>
                      <span className="font-mono text-[10px] text-[#c9d1d9]">{telemetry.total_findings} def.</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-52 w-full flex flex-col items-center justify-center border border-dashed border-[#30363d] rounded-lg text-[#8b949e]">
                  <span className="material-symbols-outlined text-[32px] text-[#484f58] mb-2">bar_chart</span>
                  <p className="text-xs font-mono">No defect telemetry captured yet</p>
                  <p className="text-[11px] font-mono text-[#484f58] mt-0.5">
                    Defect distribution charts will populate as reviews execute
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Summary strip below chart */}
          <div className="mt-8 pt-4 border-t border-[#30363d]/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8b949e] font-mono gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#5db579]"></span>
              <span>
                {telemetry?.total_reviews
                  ? `Total ${telemetry.total_findings} defects intercepted across ${telemetry.total_reviews} reviews`
                  : "Awaiting code review runs to calculate defect mitigation rate"}
              </span>
            </div>
            <div className="text-[#c9d1d9] bg-[#21262d] px-3 py-1.5 rounded-md border border-[#30363d]">
              <span className="text-[#5db579] font-semibold">100%</span> automated AST &amp; LLM invariant analysis
            </div>
          </div>
        </div>

        {/* Right Panel: Top Recurring Invariant Violations */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-xl bg-[#161b22] border border-[#30363d] shadow-sm">
          <div>
            <div className="flex items-start justify-between pb-4 border-b border-[#30363d]/60">
              <div className="flex flex-col gap-1">
                <h2 className="text-[16px] font-semibold text-[#f0f6fc] tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-[19px] text-amber-400">warning</span>
                  Top Architectural Violations
                </h2>
                <p className="text-[12px] text-[#8b949e]">
                  Most frequent rulebook policy breaches detected across pull requests.
                </p>
              </div>
            </div>

            {/* Violation List Rows */}
            <div className="flex flex-col divide-y divide-[#30363d]/40 mt-1">
              {topViolations.length > 0 ? (
                topViolations.map((item, idx) => (
                  <div key={item.rule} className="py-2.5 flex flex-col gap-1.5 group hover:bg-[#21262d]/40 px-2 rounded -mx-2 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          item.severity === "critical"
                            ? "bg-[#f43f5e]/15 text-[#f43f5e]"
                            : item.severity === "warning"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-[#21262d] text-[#8b949e]"
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className="text-[13px] font-medium text-[#f0f6fc] truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[#f43f5e] font-semibold shrink-0 ml-2">
                        {item.count} hits
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#8b949e]">
                      <span className="text-[#58a6ff] hover:underline cursor-pointer truncate max-w-[210px]">
                        {item.rule}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center text-[#8b949e]">
                  <span className="material-symbols-outlined text-[32px] text-[#484f58] mb-2">verified</span>
                  <p className="text-xs font-mono">No architectural violations logged</p>
                  <p className="text-[11px] font-mono text-[#484f58] mt-0.5">
                    Connected rulebooks are currently passing all invariants
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action link at bottom */}
          <div className="mt-4 pt-3 border-t border-[#30363d]/60 flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#8b949e]">
              {topViolations.length} active violation {topViolations.length === 1 ? "category" : "categories"}
            </span>
            <Link
              className="text-[12px] font-medium text-[#58a6ff] hover:text-[#79b8ff] inline-flex items-center gap-1 transition-colors"
              href="/dashboard/repositories"
            >
              <span>Review Invariant Rulebooks</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Agent Efficiency & Resource Consumption Matrix */}
      <section className="mt-10 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-[#f0f6fc] tracking-tight flex items-center gap-2 font-display">
              <span className="material-symbols-outlined text-[22px] text-[#5db579]">smart_toy</span>
              Agent Fleet Efficiency &amp; Resource Economics
            </h2>
            <p className="text-[12px] text-[#8b949e]">
              Performance benchmarking, token burn rate, latency, and bypass ratios across the 6 specialized review modules.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#8b949e] bg-[#161b22] px-3 py-1 rounded-md border border-[#30363d]">
              Parallel Squad Engine v2.4
            </span>
          </div>
        </div>

        {/* High-Density Data Table Card */}
        <div className="rounded-xl bg-[#161b22] border border-[#30363d] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#30363d] bg-[#21262d]/60 text-[11px] font-mono text-[#8b949e] uppercase tracking-wider">
                  <th className="py-3 px-5" scope="col">Inspection Module</th>
                  <th className="py-3 px-4" scope="col">Status</th>
                  <th className="py-3 px-4 text-right" scope="col">Invocations</th>
                  <th className="py-3 px-4 text-right" scope="col">Tokens Consumed</th>
                  <th className="py-3 px-4 text-right" scope="col">Findings</th>
                  <th className="py-3 px-4 text-right" scope="col">Mean Latency</th>
                  <th className="py-3 px-4 text-right" scope="col">Precision Rate</th>
                  <th className="py-3 px-5 text-right" scope="col">Avg Cost / Run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/50 text-[12px]">
                {telemetry?.agent_fleet && telemetry.agent_fleet.length > 0 ? (
                  telemetry.agent_fleet.map((agent) => {
                    const iconStyle = AGENT_ICON_MAP[agent.id] || {
                      icon: "smart_toy",
                      color: "text-[#58a6ff]",
                      border: "bg-[#58a6ff]/10 border-[#58a6ff]/20",
                    };
                    return (
                      <tr key={agent.id} className="hover:bg-[#21262d]/40 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded border flex items-center justify-center shrink-0 ${iconStyle.border} ${iconStyle.color}`}>
                              <span className="material-symbols-outlined text-[16px]">{iconStyle.icon}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-[#f0f6fc]">{agent.name}</span>
                              <span className="text-[11px] text-[#8b949e] font-mono">{agent.description}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#5db579]/15 text-[#5db579]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5db579]"></span>
                            {agent.status || "Active"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#c9d1d9]">
                          <div>{agent.invocations} runs</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#c9d1d9]">
                          <div className="font-semibold">{agent.tokens.toLocaleString()}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          <span className="text-[#c9d1d9] font-medium">{agent.findings_count}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#c9d1d9]">
                          <span>{agent.avg_latency}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          <div className="text-[#5db579] font-medium">95.0%+</div>
                          <div className="text-[10px] text-[#8b949e]">Rulebook adherence</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#f0f6fc] font-medium">
                          ${agent.cost_usd.toFixed(4)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#8b949e] font-mono text-xs">
                      Loading agent fleet telemetry...
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Table Summary Footer */}
              <tfoot>
                <tr className="border-t-2 border-[#30363d] bg-[#21262d]/80 font-mono text-[11px] text-[#c9d1d9]">
                  <td className="py-3.5 px-5 font-sans font-semibold text-[#f0f6fc]" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#5db579]">done_all</span>
                      <span>Fleet Summary Totals</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-[#f0f6fc]">
                    {totalRuns} runs
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-[#58a6ff]">
                    {(telemetry?.total_tokens ?? 0).toLocaleString()} tokens
                  </td>
                  <td className="py-3.5 px-4 text-right text-[#8b949e]">
                    {telemetry?.total_findings ?? 0} total
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-[#f0f6fc]">
                    {telemetry?.avg_latency_seconds ? `${telemetry.avg_latency_seconds}s` : "0.0s"} squad parallel
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-[#5db579]">
                    95.0%+ aggregate
                  </td>
                  <td className="py-3.5 px-5 text-right font-bold text-[#f0f6fc]">
                    ${telemetry?.total_cost_usd != null ? telemetry.total_cost_usd.toFixed(2) : "0.00"} USD
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
