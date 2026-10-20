"use client";

import { useState } from "react";
import Link from "next/link";

export default function AnalyticsPage() {
  const [selectedRepo, setSelectedRepo] = useState("All Repositories (14)");
  const [selectedWindow, setSelectedWindow] = useState("Last 30 Days");

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
            <button
              className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#161b22] border border-[#30363d] hover:border-[#8b949e] text-[#c9d1d9] text-[12px] font-mono transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-[#8b949e]">source_environment</span>
              <span>{selectedRepo}</span>
              <span className="material-symbols-outlined text-[14px] text-[#8b949e]">expand_more</span>
            </button>
          </div>

          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#161b22] border border-[#30363d] hover:border-[#8b949e] text-[#c9d1d9] text-[12px] font-mono transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-[#8b949e]">calendar_today</span>
              <span>{selectedWindow}</span>
              <span className="text-[#484f58]">|</span>
              <span className="text-[#8b949e]">Oct 24 - Nov 23, 2024</span>
              <span className="material-symbols-outlined text-[14px] text-[#8b949e]">expand_more</span>
            </button>
          </div>

          {/* Export Report Button */}
          <button
            className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#f0f6fc] text-[12px] font-medium transition-colors shadow-sm"
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
            <span className="font-mono text-3xl font-semibold text-[#f0f6fc]">14,890</span>
            <span className="inline-flex items-center text-[11px] font-mono text-[#5db579] bg-[#5db579]/10 px-2 py-0.5 rounded">
              <span className="material-symbols-outlined text-[12px] mr-0.5">trending_up</span>+18.4%
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#30363d]/50 flex items-center justify-between text-[11px] text-[#8b949e] font-mono">
            <span>Across 428 pull requests</span>
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
            <span className="font-mono text-3xl font-semibold text-[#f0f6fc]">134</span>
            <span className="text-[11px] font-mono text-[#8b949e]">pre-merge</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#30363d]/50 flex items-center gap-2 text-[10.5px] font-mono">
            <span className="px-2 py-0.5 rounded bg-[#f43f5e]/15 text-[#f43f5e] font-medium">39 Crit</span>
            <span className="text-[#484f58]">•</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">71 Warn</span>
            <span className="text-[#484f58]">•</span>
            <span className="px-2 py-0.5 rounded bg-[#30363d]/70 text-[#8b949e]">24 Info</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="flex flex-col justify-between p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#484f58] transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#8b949e] tracking-tight">Agent Fleet Efficiency</span>
            <span className="material-symbols-outlined text-[18px] text-[#5db579]">bolt</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-semibold text-[#f0f6fc]">99.4%</span>
            <span className="inline-flex items-center text-[11px] font-mono text-[#5db579] bg-[#5db579]/10 px-2 py-0.5 rounded">
              Operational
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#30363d]/50 flex items-center justify-between text-[11px] text-[#8b949e] font-mono">
            <span>Avg squad latency</span>
            <span className="text-[#f0f6fc] font-medium">3.8s</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="flex flex-col justify-between p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#484f58] transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#8b949e] tracking-tight">Aggregate Inference Cost</span>
            <span className="material-symbols-outlined text-[18px] text-[#8b949e]">payments</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-semibold text-[#f0f6fc]">$18.42</span>
            <span className="text-[11px] font-mono text-[#8b949e]">USD</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#30363d]/50 flex items-center justify-between text-[11px] text-[#8b949e] font-mono">
            <span>Avg $0.043 / review</span>
            <span>4.2M tokens</span>
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

            {/* Stacked Chart Visualization */}
            <div className="mt-10 mb-6">
              <div className="relative h-52 w-full flex items-end justify-between gap-5 px-3 pb-7 border-b border-[#30363d]">
                {/* Horizontal Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
                  <div className="border-b border-[#30363d]/30 w-full flex justify-end pr-1">
                    <span className="font-mono text-[10px] text-[#484f58]">35</span>
                  </div>
                  <div className="border-b border-[#30363d]/30 w-full flex justify-end pr-1">
                    <span className="font-mono text-[10px] text-[#484f58]">25</span>
                  </div>
                  <div className="border-b border-[#30363d]/30 w-full flex justify-end pr-1">
                    <span className="font-mono text-[10px] text-[#484f58]">15</span>
                  </div>
                  <div className="border-b border-[#30363d]/30 w-full flex justify-end pr-1">
                    <span className="font-mono text-[10px] text-[#484f58]">0</span>
                  </div>
                </div>

                {/* Bar 1: W43 */}
                <div className="relative z-10 flex-1 flex flex-col items-center group">
                  <div className="w-full max-w-[48px] flex flex-col-reverse rounded-t overflow-hidden bg-[#21262d]/50 hover:brightness-110 transition-all cursor-pointer" style={{ height: "51%" }}>
                    <div className="w-full bg-[#484f58]" style={{ height: "22.2%" }} title="Info: 4"></div>
                    <div className="w-full bg-amber-400/90" style={{ height: "55.6%" }} title="Warning: 10"></div>
                    <div className="w-full bg-[#f43f5e]" style={{ height: "22.2%" }} title="Critical: 4"></div>
                  </div>
                  <div className="absolute -bottom-6 flex flex-col items-center">
                    <span className="font-mono text-[11px] text-[#8b949e]">W43</span>
                    <span className="font-mono text-[10px] text-[#484f58]">18 def.</span>
                  </div>
                </div>

                {/* Bar 2: W44 */}
                <div className="relative z-10 flex-1 flex flex-col items-center group">
                  <div className="w-full max-w-[48px] flex flex-col-reverse rounded-t overflow-hidden bg-[#21262d]/50 hover:brightness-110 transition-all cursor-pointer" style={{ height: "74%" }}>
                    <div className="w-full bg-[#484f58]" style={{ height: "19.2%" }} title="Info: 5"></div>
                    <div className="w-full bg-amber-400/90" style={{ height: "53.8%" }} title="Warning: 14"></div>
                    <div className="w-full bg-[#f43f5e]" style={{ height: "27%" }} title="Critical: 7"></div>
                  </div>
                  <div className="absolute -bottom-6 flex flex-col items-center">
                    <span className="font-mono text-[11px] text-[#8b949e]">W44</span>
                    <span className="font-mono text-[10px] text-[#484f58]">26 def.</span>
                  </div>
                </div>

                {/* Bar 3: W45 */}
                <div className="relative z-10 flex-1 flex flex-col items-center group">
                  <div className="w-full max-w-[48px] flex flex-col-reverse rounded-t overflow-hidden bg-[#21262d]/50 hover:brightness-110 transition-all cursor-pointer" style={{ height: "88%" }}>
                    <div className="w-full bg-[#484f58]" style={{ height: "19.4%" }} title="Info: 6"></div>
                    <div className="w-full bg-amber-400/90" style={{ height: "51.6%" }} title="Warning: 16"></div>
                    <div className="w-full bg-[#f43f5e]" style={{ height: "29%" }} title="Critical: 9"></div>
                  </div>
                  <div className="absolute -bottom-6 flex flex-col items-center">
                    <span className="font-mono text-[11px] text-[#8b949e]">W45</span>
                    <span className="font-mono text-[10px] text-[#484f58]">31 def.</span>
                  </div>
                </div>

                {/* Bar 4: W46 */}
                <div className="relative z-10 flex-1 flex flex-col items-center group">
                  <div className="w-full max-w-[48px] flex flex-col-reverse rounded-t overflow-hidden bg-[#21262d]/50 hover:brightness-110 transition-all cursor-pointer" style={{ height: "80%" }}>
                    <div className="w-full bg-[#484f58]" style={{ height: "17.9%" }} title="Info: 5"></div>
                    <div className="w-full bg-amber-400/90" style={{ height: "53.5%" }} title="Warning: 15"></div>
                    <div className="w-full bg-[#f43f5e]" style={{ height: "28.6%" }} title="Critical: 8"></div>
                  </div>
                  <div className="absolute -bottom-6 flex flex-col items-center">
                    <span className="font-mono text-[11px] text-[#8b949e]">W46</span>
                    <span className="font-mono text-[10px] text-[#484f58]">28 def.</span>
                  </div>
                </div>

                {/* Bar 5: W47 (Current) */}
                <div className="relative z-10 flex-1 flex flex-col items-center group">
                  <div className="w-full max-w-[48px] flex flex-col-reverse rounded-t overflow-hidden bg-[#21262d]/50 hover:brightness-110 transition-all cursor-pointer ring-1 ring-[#58a6ff]/40" style={{ height: "88%" }}>
                    <div className="w-full bg-[#484f58]" style={{ height: "12.9%" }} title="Info: 4"></div>
                    <div className="w-full bg-amber-400/90" style={{ height: "51.6%" }} title="Warning: 16"></div>
                    <div className="w-full bg-[#f43f5e]" style={{ height: "35.5%" }} title="Critical: 11"></div>
                  </div>
                  <div className="absolute -bottom-6 flex flex-col items-center">
                    <span className="font-mono text-[11px] text-[#58a6ff] font-semibold">W47 (Cur)</span>
                    <span className="font-mono text-[10px] text-[#c9d1d9]">31 def.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary strip below chart */}
          <div className="mt-8 pt-4 border-t border-[#30363d]/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8b949e] font-mono gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#5db579]"></span>
              <span>Average <strong className="text-[#f0f6fc]">26.8</strong> defects intercepted per week</span>
            </div>
            <div className="text-[#c9d1d9] bg-[#21262d] px-3 py-1.5 rounded-md border border-[#30363d]">
              <span className="text-[#5db579] font-semibold">89.2%</span> auto-remediated via AI suggestions
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
              {/* Rank 1 */}
              <div className="py-2.5 flex flex-col gap-1.5 group hover:bg-[#21262d]/40 px-2 rounded -mx-2 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#f43f5e]/15 text-[#f43f5e] font-semibold">
                      #1
                    </span>
                    <span className="text-[13px] font-medium text-[#f0f6fc] truncate">
                      Missing tenant_id scoping in query layer
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#f43f5e] font-semibold shrink-0 ml-2">18 hits</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8b949e]">
                  <span className="text-[#58a6ff] hover:underline cursor-pointer truncate max-w-[210px]">
                    rule/tenant-isolation-v2
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-[#f43f5e]">
                    <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                    <span>+4 this wk</span>
                  </div>
                </div>
                <div className="text-[10px] text-[#8b949e] font-mono truncate">
                  payment-service, checkout-api
                </div>
              </div>

              {/* Rank 2 */}
              <div className="py-2.5 flex flex-col gap-1.5 group hover:bg-[#21262d]/40 px-2 rounded -mx-2 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#f43f5e]/15 text-[#f43f5e] font-semibold">
                      #2
                    </span>
                    <span className="text-[13px] font-medium text-[#f0f6fc] truncate">
                      Unsanitized user input in worker task
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#f43f5e] font-semibold shrink-0 ml-2">12 hits</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8b949e]">
                  <span className="text-[#58a6ff] hover:underline cursor-pointer truncate max-w-[210px]">
                    rule/sec-sanitize-inputs
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-[#5db579]">
                    <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                    <span>-2 this wk</span>
                  </div>
                </div>
                <div className="text-[10px] text-[#8b949e] font-mono truncate">
                  data-warehouse, payment-service
                </div>
              </div>

              {/* Rank 3 */}
              <div className="py-2.5 flex flex-col gap-1.5 group hover:bg-[#21262d]/40 px-2 rounded -mx-2 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-semibold">
                      #3
                    </span>
                    <span className="text-[13px] font-medium text-[#f0f6fc] truncate">
                      Missing unit test for exported logic
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-amber-400 font-semibold shrink-0 ml-2">9 hits</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8b949e]">
                  <span className="text-[#58a6ff] hover:underline cursor-pointer truncate max-w-[210px]">
                    rule/coverage-mandatory
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-[#8b949e]">
                    <span>0 vs prior</span>
                  </div>
                </div>
                <div className="text-[10px] text-[#8b949e] font-mono truncate">
                  core-api, marketing-web
                </div>
              </div>

              {/* Rank 4 */}
              <div className="py-2.5 flex flex-col gap-1.5 group hover:bg-[#21262d]/40 px-2 rounded -mx-2 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-semibold">
                      #4
                    </span>
                    <span className="text-[13px] font-medium text-[#f0f6fc] truncate">
                      Unhandled promise in async worker
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-amber-400 font-semibold shrink-0 ml-2">7 hits</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8b949e]">
                  <span className="text-[#58a6ff] hover:underline cursor-pointer truncate max-w-[210px]">
                    rule/defensive-error-boundaries
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-[#5db579]">
                    <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                    <span>-3 this wk</span>
                  </div>
                </div>
                <div className="text-[10px] text-[#8b949e] font-mono truncate">
                  notification-engine, billing-crons
                </div>
              </div>
            </div>
          </div>

          {/* Action link at bottom */}
          <div className="mt-4 pt-3 border-t border-[#30363d]/60 flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#8b949e]">4 active blocking invariants</span>
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
                  <th className="py-3 px-4 text-right" scope="col">Bypass Freq.</th>
                  <th className="py-3 px-4 text-right" scope="col">Mean Latency</th>
                  <th className="py-3 px-4 text-right" scope="col">Precision Rate</th>
                  <th className="py-3 px-5 text-right" scope="col">Avg Cost / Run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/50 text-[12px]">
                {/* Row 1: Security Sentinel */}
                <tr className="hover:bg-[#21262d]/40 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-[#f43f5e]/10 border border-[#f43f5e]/20 flex items-center justify-center text-[#f43f5e] shrink-0">
                        <span className="material-symbols-outlined text-[16px]">security</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[#f0f6fc]">Security Sentinel</span>
                        <span className="text-[11px] text-[#8b949e] font-mono">OWASP, Secrets, Injection Invariants</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#5db579]/15 text-[#5db579]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5db579]"></span>
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#c9d1d9]">
                    <div>428 runs</div>
                    <div className="text-[10px] text-[#8b949e]">100% coverage</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#c9d1d9]">
                    <div className="font-semibold">1,248,500</div>
                    <div className="text-[10px] text-[#8b949e]">720k in / 528k out</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span className="text-[#5db579] font-medium">0.0%</span>
                    <div className="text-[10px] text-[#8b949e]">Mandatory</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#c9d1d9]">
                    <span>1.4s</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <div className="text-[#5db579] font-medium">96.4%</div>
                    <div className="text-[10px] text-[#8b949e]">High Precision</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#f0f6fc] font-medium">
                    $0.0052
                  </td>
                </tr>

                {/* Row 2: Logic & Concurrency */}
                <tr className="hover:bg-[#21262d]/40 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-[#58a6ff]/10 border border-[#58a6ff]/20 flex items-center justify-center text-[#58a6ff] shrink-0">
                        <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[#f0f6fc]">Logic &amp; Concurrency</span>
                        <span className="text-[11px] text-[#8b949e] font-mono">Runtime Stability &amp; Memory Leaks</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#5db579]/15 text-[#5db579]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5db579]"></span>
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <div>384 runs</div>
                    <div className="text-[10px] text-[#8b949e]">89.7% coverage</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <div className="font-semibold">890,200</div>
                    <div className="text-[10px] text-[#8b949e]">510k in / 380k out</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="text-[#c9d1d9]">10.3%</span>
                    <div className="text-[10px] text-[#8b949e]">Rapid Dev Preset</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <span>1.1s</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <div className="text-[#5db579] font-medium">94.2%</div>
                    <div className="text-[10px] text-[#8b949e]">3 dev overrides</div>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-[#f0f6fc] font-medium">
                    $0.0038
                  </td>
                </tr>

                {/* Row 3: Defensive Error Handling */}
                <tr className="hover:bg-[#21262d]/40 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
                        <span className="material-symbols-outlined text-[16px]">crisis_alert</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[#f0f6fc]">Defensive Error Handling</span>
                        <span className="text-[11px] text-[#8b949e] font-mono">Exception Boundaries &amp; Resilience</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#5db579]/15 text-[#5db579]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5db579]"></span>
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <div>356 runs</div>
                    <div className="text-[10px] text-[#8b949e]">83.2% coverage</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <div className="font-semibold">640,100</div>
                    <div className="text-[10px] text-[#8b949e]">390k in / 250k out</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="text-[#c9d1d9]">16.8%</span>
                    <div className="text-[10px] text-[#8b949e]">Preset bypass</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <span>0.8s</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <div className="text-[#5db579] font-medium">91.5%</div>
                    <div className="text-[10px] text-[#8b949e]">Consistent</div>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-[#f0f6fc] font-medium">
                    $0.0027
                  </td>
                </tr>

                {/* Row 4: Code Quality & Consistency */}
                <tr className="hover:bg-[#21262d]/40 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-[#8b949e]/10 border border-[#8b949e]/20 flex items-center justify-center text-[#8b949e] shrink-0">
                        <span className="material-symbols-outlined text-[16px]">tune</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[#f0f6fc]">Code Quality &amp; Consistency</span>
                        <span className="text-[11px] text-[#8b949e] font-mono">Clean Code &amp; Idiomatic Patterns</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#5db579]/15 text-[#5db579]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5db579]"></span>
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <div>298 runs</div>
                    <div className="text-[10px] text-[#8b949e]">69.6% coverage</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <div className="font-semibold">512,000</div>
                    <div className="text-[10px] text-[#8b949e]">310k in / 202k out</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="text-amber-400 font-medium">30.4%</span>
                    <div className="text-[10px] text-[#8b949e]">Low-noise profiles</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <span>0.6s</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <div className="text-[#c9d1d9] font-medium">88.0%</div>
                    <div className="text-[10px] text-[#8b949e]">Style adherence</div>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-[#f0f6fc] font-medium">
                    $0.0021
                  </td>
                </tr>

                {/* Row 5: Test Coverage Assurance */}
                <tr className="hover:bg-[#21262d]/40 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-[#5db579]/10 border border-[#5db579]/20 flex items-center justify-center text-[#5db579] shrink-0">
                        <span className="material-symbols-outlined text-[16px]">fact_check</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[#f0f6fc]">Test Coverage Assurance</span>
                        <span className="text-[11px] text-[#8b949e] font-mono">Edge Cases &amp; Fixture Verification</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#5db579]/15 text-[#5db579]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5db579]"></span>
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <div>340 runs</div>
                    <div className="text-[10px] text-[#8b949e]">79.4% coverage</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <div className="font-semibold">620,400</div>
                    <div className="text-[10px] text-[#8b949e]">400k in / 220k out</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="text-[#c9d1d9]">20.6%</span>
                    <div className="text-[10px] text-[#8b949e]">Skip on chore PRs</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <span>0.9s</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <div className="text-[#5db579] font-medium">93.1%</div>
                    <div className="text-[10px] text-[#8b949e]">Fixtures gen</div>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-[#f0f6fc] font-medium">
                    $0.0026
                  </td>
                </tr>

                {/* Row 6: Documentation Integrity */}
                <tr className="hover:bg-[#21262d]/40 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-[#8b949e]/10 border border-[#8b949e]/20 flex items-center justify-center text-[#8b949e] shrink-0">
                        <span className="material-symbols-outlined text-[16px]">menu_book</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[#f0f6fc]">Documentation Integrity</span>
                        <span className="text-[11px] text-[#8b949e] font-mono">TSDoc, OpenAPI Specs &amp; Drift</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#5db579]/15 text-[#5db579]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5db579]"></span>
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <div>215 runs</div>
                    <div className="text-[10px] text-[#8b949e]">50.2% coverage</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <div className="font-semibold">288,800</div>
                    <div className="text-[10px] text-[#8b949e]">180k in / 108k out</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="text-amber-400 font-medium">49.8%</span>
                    <div className="text-[10px] text-[#8b949e]">High Assurance only</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#c9d1d9]">
                    <span>0.4s</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <div className="text-[#c9d1d9] font-medium">85.4%</div>
                    <div className="text-[10px] text-[#8b949e]">Spec parity</div>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-[#f0f6fc] font-medium">
                    $0.0012
                  </td>
                </tr>
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
                    2,021 runs
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-[#58a6ff]">
                    4,200,000 tokens
                  </td>
                  <td className="py-3.5 px-4 text-right text-[#8b949e]">
                    21.3% mean
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-[#f0f6fc]">
                    3.8s squad parallel
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-[#5db579]">
                    93.1% aggregate
                  </td>
                  <td className="py-3.5 px-5 text-right font-bold text-[#f0f6fc]">
                    $18.42 USD
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
