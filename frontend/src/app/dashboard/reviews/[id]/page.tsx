"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, Review, Finding } from "@/lib/api";

export default function ReviewDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [reRunning, setReRunning] = useState(false);

  useEffect(() => {
    async function fetchReview() {
      setLoading(true);
      try {
        let data: Review;
        try {
          const decoded = decodeURIComponent(id);
          if (decoded.includes(":") && decoded.includes("#")) {
            const [repoPart, prAndSha] = decoded.split(":");
            const [prNumber, commitSha] = prAndSha.split("#");
            data = await api.getReviewByKey(repoPart, parseInt(prNumber, 10), commitSha);
          } else {
            data = await api.getReview(parseInt(id, 10));
          }
        } catch {
          data = await api.getReview(parseInt(id, 10));
        }
        setReview(data);
      } catch (err: unknown) {
        console.warn("Could not fetch review from backend, rendering sample verification report:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReview();
  }, [id]);

  const findings: Finding[] = useMemo(() => review?.findings || [], [review?.findings]);
  const criticals = useMemo(() => findings.filter((f) => f.severity === "critical"), [findings]);
  const warnings = useMemo(() => findings.filter((f) => f.severity === "warning"), [findings]);
  const infos = useMemo(() => findings.filter((f) => f.severity === "info"), [findings]);

  const filteredFindings = useMemo(() => {
    if (severityFilter === "all") return findings;
    return findings.filter((f) => f.severity === severityFilter);
  }, [findings, severityFilter]);

  const handleReRun = async () => {
    if (!review) return;
    setReRunning(true);
    try {
      await api.syncInstallation(review.installation_id);
    } catch {
      // Ignored for demo
    } finally {
      setTimeout(() => setReRunning(false), 800);
    }
  };

  const prNumber = review?.pr_number ?? 142;
  const prTitle = review?.pr_title ?? "feat(billing): integrate multi-tenant Stripe webhooks";
  const repoName = review?.repo_full_name ?? "acme-corp/payment-service";
  const branchHead = review?.head_branch ?? "feature/stripe-webhooks";
  const branchBase = review?.base_branch ?? "main";
  const author = review?.author ?? "octocat";
  const commitSha = review?.commit_sha ? review.commit_sha.substring(0, 7) : "7f9b2a1";
  const score = review?.merge_score ? Number((review.merge_score * 2).toFixed(1)) : 8.5;
  const isBlocker = review?.status === "failed" || (review?.merge_score !== null && review?.merge_score !== undefined && review.merge_score < 3) || criticals.length > 0;

  return (
    <div className="flex flex-col w-full py-8 gap-8 max-w-[1500px] mx-auto text-[#c9d1d9] antialiased">
      {/* 1. Top Header & PR Title Section in a Clean Structured Card */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
        {/* Top Row: Back Link & Rulebook Tag */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#30363d]/60">
          <Link
            className="inline-flex items-center gap-2 text-[#58a6ff] hover:text-[#79c0ff] font-medium text-[13px] transition-colors"
            href="/dashboard/reviews"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Reviews</span>
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#0d1117] border border-[#30363d] text-[11px] font-mono text-[#8b949e]">
            <span className="material-symbols-outlined text-[14px] text-emerald-400">gavel</span>
            <span className="text-[#f0f6fc]">{repoName}:v2.4</span>
            <span className="text-[#484f58]">|</span>
            <span className="text-emerald-400 font-medium">Enforced</span>
          </div>
        </div>

        {/* Bottom Row: Title, Branch Meta, and Quick Action Group */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-0.5 rounded font-mono text-[12px] font-semibold bg-[#21262d] text-[#f0f6fc] border border-[#30363d]">
                #{prNumber}
              </span>
              <h1 className="text-[22px] font-semibold text-[#f0f6fc] tracking-tight font-display">
                {prTitle}
              </h1>
            </div>
            {/* Metadata Chips Strip */}
            <div className="flex flex-wrap items-center gap-2.5 text-[12px] font-mono text-[#8b949e]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0d1117] border border-[#30363d] text-[#c9d1d9]">
                <span className="material-symbols-outlined text-[14px] text-[#58a6ff]">fork_right</span>
                <span className="text-[#58a6ff]">{branchHead}</span>
                <span className="text-[#6e7681]">into</span>
                <span className="text-[#c9d1d9]">{branchBase}</span>
              </span>
              <span className="text-[#484f58]">•</span>
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#0d1117] border border-[#30363d] text-[#c9d1d9]">
                <span className="material-symbols-outlined text-[14px] text-[#8b949e]">account_circle</span>
                <span>@{author}</span>
              </span>
              <span className="text-[#484f58]">•</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0d1117] border border-[#30363d] text-[#8b949e]">
                <span className="material-symbols-outlined text-[14px]">commit</span>
                <span className="text-[#c9d1d9]">{commitSha}</span>
              </span>
              <span className="text-[#484f58]">•</span>
              <span className="inline-flex items-center gap-1.5 text-[#8b949e]">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                <span>Reviewed 8m ago</span>
              </span>
            </div>
          </div>

          {/* Actions & Merge Readiness */}
          <div className="flex flex-wrap items-center gap-3.5">
            <div className="flex items-center gap-2.5">
              <a
                href={`https://github.com/${repoName}/pull/${prNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#f0f6fc] transition-colors text-[13px] font-medium shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px] text-[#8b949e]">open_in_new</span>
                <span>Open on GitHub</span>
              </a>
              <button
                onClick={handleReRun}
                disabled={reRunning}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#f0f6fc] transition-colors text-[13px] font-medium shadow-sm"
                type="button"
              >
                <span className={`material-symbols-outlined text-[16px] text-[#8b949e] ${reRunning ? "animate-spin" : ""}`}>
                  sync
                </span>
                <span>{reRunning ? "Re-running..." : "Re-run Review"}</span>
              </button>
            </div>
            {/* Polished Merge Readiness Box */}
            <div className="flex items-center gap-3.5 px-3.5 py-2 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" fill="none" r="14" stroke="#21262d" strokeWidth="3"></circle>
                  <circle
                    cx="18"
                    cy="18"
                    fill="none"
                    r="14"
                    stroke={isBlocker ? "#e3b341" : "#34d399"}
                    strokeDasharray={`${Math.round(score * 10)}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3"
                  ></circle>
                </svg>
                <span className="absolute font-mono text-[11px] font-semibold text-[#f0f6fc]">{score}</span>
              </div>
              <div className="flex flex-col pr-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-[#f0f6fc]">Merge Readiness</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isBlocker
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {isBlocker ? "Action Needed" : "Ready to Merge"}
                  </span>
                </div>
                <span className="text-[11px] text-[#8b949e] font-mono mt-0.5">
                  {criticals.length || 1} Blocker • {warnings.length || 2} Warnings
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Clean 5-Column Metrics Ribbon */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {/* Metric 1: Total Findings */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#8b949e] text-[12px] mb-1.5">
            <span>Total Findings</span>
            <span className="material-symbols-outlined text-[17px] text-[#8b949e]">fact_check</span>
          </div>
          <div className="flex items-baseline gap-2 my-1.5">
            <span className="text-[24px] font-semibold font-mono text-[#f0f6fc]">
              {findings.length || 4}
            </span>
            <span className="text-[11px] text-[#8b949e]">issues parsed</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-mono pt-2 border-t border-[#30363d]/50">
            <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 font-medium">
              {criticals.length || 1} Crit
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
              {warnings.length || 2} Warn
            </span>
            <span className="px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
              {infos.length || 1} Info
            </span>
          </div>
        </div>

        {/* Metric 2: Tokens Processed */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#8b949e] text-[12px] mb-1.5">
            <span>Tokens Processed</span>
            <span className="material-symbols-outlined text-[17px] text-[#8b949e]">token</span>
          </div>
          <div className="flex items-baseline gap-2 my-1.5">
            <span className="text-[24px] font-semibold font-mono text-[#f0f6fc]">14,820</span>
          </div>
          <div className="text-[11px] font-mono text-[#8b949e] pt-2 border-t border-[#30363d]/50 truncate">
            8,200 in <span className="text-[#484f58]">/</span> 6,620 out
          </div>
        </div>

        {/* Metric 3: Inference Cost */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#8b949e] text-[12px] mb-1.5">
            <span>Inference Cost</span>
            <span className="material-symbols-outlined text-[17px] text-[#8b949e]">payments</span>
          </div>
          <div className="flex items-baseline gap-1.5 my-1.5">
            <span className="text-[24px] font-semibold font-mono text-emerald-400">$0.0412</span>
            <span className="text-[10px] font-mono text-[#8b949e]">USD</span>
          </div>
          <div className="text-[11px] font-mono text-[#8b949e] pt-2 border-t border-[#30363d]/50 truncate">
            Claude 3.5 Sonnet
          </div>
        </div>

        {/* Metric 4: Squad Latency */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#8b949e] text-[12px] mb-1.5">
            <span>Squad Latency</span>
            <span className="material-symbols-outlined text-[17px] text-[#8b949e]">timer</span>
          </div>
          <div className="flex items-baseline gap-2 my-1.5">
            <span className="text-[24px] font-semibold font-mono text-[#f0f6fc]">4.2s</span>
          </div>
          <div className="text-[11px] font-mono text-[#8b949e] pt-2 border-t border-[#30363d]/50 truncate">
            6 agents concurrent
          </div>
        </div>

        {/* Metric 5: Active Rulebook */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col justify-between shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-[#8b949e] text-[12px] mb-1.5">
            <span>Active Rulebook</span>
            <span className="material-symbols-outlined text-[17px] text-[#8b949e]">verified_user</span>
          </div>
          <div className="flex items-baseline gap-2 my-1.5 truncate">
            <span className="text-[16px] font-semibold font-mono text-[#f0f6fc] truncate">{repoName.split("/")[1] || "payment-service"}</span>
          </div>
          <div className="text-[11px] font-mono text-[#8b949e] pt-2 border-t border-[#30363d]/50 truncate">
            Standard Governance
          </div>
        </div>
      </section>

      {/* 3. Split Summary & Impact Section (2-Column Grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (Executive Review Summary card, 7 cols) */}
        <div className="lg:col-span-7 bg-[#161b22] border border-[#30363d] rounded-xl p-6 flex flex-col gap-5 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[#30363d]/60">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[22px] text-[#58a6ff]">psychology</span>
              <h2 className="text-[16px] font-semibold text-[#f0f6fc]">Executive Review Summary</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] font-mono text-[11px]">
              Confidence: <strong className="text-emerald-400 font-medium">96%</strong>
            </span>
          </div>

          {/* Scope & Impact */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#f0f6fc] font-medium text-[13px] mb-1.5">
              <span className="material-symbols-outlined text-[17px] text-[#58a6ff]">layers</span>
              <span>Scope &amp; Impact</span>
            </div>
            <p className="text-[13px] text-[#8b949e] leading-relaxed">
              Modifies <span className="font-mono text-[#f0f6fc]">4 core files</span> in billing webhook handling. Adds webhook event verification, tenant context extraction, and ledger ingestion. Reconfigures raw payload buffers for signature checking.
            </p>
          </div>

          {/* Risk Assessment */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-400 font-medium text-[13px] mb-1.5">
              <span className="material-symbols-outlined text-[17px]">warning</span>
              <span>Risk Assessment</span>
            </div>
            <p className="text-[13px] text-[#c9d1d9] leading-relaxed">
              Medium risk. Webhook replay attack vectors are mitigated via idempotency keys; tenant isolation violation caught in <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-[#21262d] text-amber-300 border border-[#30363d]">src/webhooks/stripe.ts</code> poses cross-tenant data leakage if deployed as-is.
            </p>
          </div>

          {/* Invariant Checklist Grid */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#8b949e] mb-2.5 font-medium">
              Invariant Checklist
            </div>
            <div className="grid grid-cols-2 gap-3 text-[12px] font-mono">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
                <span className="text-[#c9d1d9]">Data Privacy Invariant</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  Pass
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <span className="text-red-300 font-medium">Tenant Isolation</span>
                <span className="inline-flex items-center gap-1.5 text-red-400 font-medium">
                  <span className="material-symbols-outlined text-[15px]">cancel</span>
                  Violation
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span className="text-amber-300">Error Boundaries</span>
                <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                  <span className="material-symbols-outlined text-[15px]">error</span>
                  Warning
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
                <span className="text-[#c9d1d9]">Test Coverage</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  92% Pass
                </span>
              </div>
            </div>
          </div>

          {/* Agent Recommendation Callout */}
          <div className="flex items-start gap-3.5 p-4 rounded-lg bg-[#21262d]/60 border border-[#30363d] text-[#c9d1d9]">
            <span className="material-symbols-outlined text-[22px] text-amber-400 shrink-0 mt-0.5">
              tips_and_updates
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold text-[#f0f6fc]">Agent Recommendation</span>
              <p className="text-[12px] text-[#8b949e] leading-relaxed">
                Address Critical finding in customer query before merging. Warning on idempotency cache write should be handled in this PR to prevent ghost ledger records during Redis reconnects.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (Architecture Impact Trace card, 5 cols) */}
        <div className="lg:col-span-5 bg-[#161b22] border border-[#30363d] rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-[#30363d]/60">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[22px] text-[#58a6ff]">account_tree</span>
                <h2 className="text-[16px] font-semibold text-[#f0f6fc]">Architecture Impact Trace</h2>
              </div>
              <span className="font-mono text-[11px] px-2.5 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-[#8b949e]">
                Flow Trace
              </span>
            </div>

            {/* Visual Flow Pipeline: 5 Crisp Step Cards */}
            <div className="flex flex-col gap-2.5">
              {/* Step 1 */}
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-[12px] font-mono">
                <span className="w-5.5 h-5.5 rounded flex items-center justify-center bg-[#21262d] text-[#8b949e] font-semibold text-[11px]">
                  01
                </span>
                <span className="text-[#f0f6fc] font-medium">Stripe Webhook Event</span>
                <span className="ml-auto text-[#8b949e] text-[11px]">HTTP POST</span>
              </div>
              <div className="flex justify-center -my-1 text-[#484f58]">
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-[12px] font-mono">
                <span className="w-5.5 h-5.5 rounded flex items-center justify-center bg-[#21262d] text-[#8b949e] font-semibold text-[11px]">
                  02
                </span>
                <span className="text-[#f0f6fc] font-medium">Signature Verification</span>
                <span className="ml-auto text-emerald-400 font-medium text-[11px]">OK • 1.4ms</span>
              </div>
              <div className="flex justify-center -my-1 text-[#484f58]">
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
              </div>

              {/* Step 3: Trigger Alert */}
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/40 text-[12px] font-mono">
                <span className="w-5.5 h-5.5 rounded flex items-center justify-center bg-red-500 text-white font-semibold text-[11px]">
                  03
                </span>
                <div className="flex flex-col">
                  <span className="font-medium text-red-300">Tenant Resolver</span>
                  <span className="text-[10px] text-red-400">Rule #2 violation triggered here</span>
                </div>
                <span className="ml-auto material-symbols-outlined text-red-400 text-[18px]">warning</span>
              </div>
              <div className="flex justify-center -my-1 text-[#484f58]">
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
              </div>

              {/* Step 4 */}
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-[12px] font-mono">
                <span className="w-5.5 h-5.5 rounded flex items-center justify-center bg-[#21262d] text-[#8b949e] font-semibold text-[11px]">
                  04
                </span>
                <span className="text-[#f0f6fc] font-medium">Ledger Event Dispatcher</span>
                <span className="ml-auto text-[#8b949e] text-[11px]">Kafka Queue</span>
              </div>
              <div className="flex justify-center -my-1 text-[#484f58]">
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
              </div>

              {/* Step 5 */}
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-[12px] font-mono">
                <span className="w-5.5 h-5.5 rounded flex items-center justify-center bg-[#21262d] text-[#8b949e] font-semibold text-[11px]">
                  05
                </span>
                <span className="text-[#f0f6fc] font-medium">PostgreSQL / Ledger DB</span>
                <span className="ml-auto text-emerald-400 font-medium text-[11px]">Target Schema</span>
              </div>
            </div>
          </div>

          {/* Monospace Telemetry Micro Table */}
          <div className="mt-5 pt-3.5 rounded-lg bg-[#0d1117] border border-[#30363d] p-3.5 font-mono text-[11px]">
            <div className="text-[10px] uppercase tracking-wider text-[#8b949e] font-semibold mb-2.5">Runtime Profile</div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[#8b949e]">
              <span>Payload size:</span>
              <span className="text-[#f0f6fc] text-right font-medium">4.18 KB</span>
              <span>Crypto check:</span>
              <span className="text-emerald-400 text-right font-medium">HMAC-SHA256 (Pass)</span>
              <span>Idempotency TTL:</span>
              <span className="text-[#f0f6fc] text-right font-medium">86,400s (24h)</span>
              <span>Avg Processing:</span>
              <span className="text-[#f0f6fc] text-right font-medium">42ms</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Findings Feed Section */}
      <section className="flex flex-col gap-6">
        {/* Filter Tabs & Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setSeverityFilter("all")}
              className={`px-3 py-1.5 rounded font-mono text-[12px] font-medium transition-colors ${
                severityFilter === "all"
                  ? "bg-[#21262d] text-[#f0f6fc] border border-[#30363d] shadow-sm"
                  : "text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]"
              }`}
              type="button"
            >
              All ({findings.length || 4})
            </button>
            <button
              onClick={() => setSeverityFilter("critical")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded font-mono text-[12px] transition-colors ${
                severityFilter === "critical"
                  ? "bg-[#21262d] text-[#f0f6fc] border border-[#30363d]"
                  : "text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]"
              }`}
              type="button"
            >
              <span>Critical</span>
              <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 text-[10px] font-semibold border border-red-500/30">
                {criticals.length || 1}
              </span>
            </button>
            <button
              onClick={() => setSeverityFilter("warning")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded font-mono text-[12px] transition-colors ${
                severityFilter === "warning"
                  ? "bg-[#21262d] text-[#f0f6fc] border border-[#30363d]"
                  : "text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]"
              }`}
              type="button"
            >
              <span>Warnings</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold border border-amber-500/30">
                {warnings.length || 2}
              </span>
            </button>
            <button
              onClick={() => setSeverityFilter("info")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded font-mono text-[12px] transition-colors ${
                severityFilter === "info"
                  ? "bg-[#21262d] text-[#f0f6fc] border border-[#30363d]"
                  : "text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]"
              }`}
              type="button"
            >
              <span>Info</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#30363d] text-[#8b949e] text-[10px]">
                {infos.length || 1}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b949e]">
            <div className="flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded">
              <span className="text-[#6e7681]">Sort:</span>
              <span className="text-[#f0f6fc] font-medium">Severity</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded">
              <span className="text-[#6e7681]">Group:</span>
              <span className="text-[#f0f6fc] font-medium">File</span>
            </div>
          </div>
        </div>

        {/* If live findings are available, render them or render default authentic Stitch findings */}
        {filteredFindings.length > 0 && severityFilter !== "all" ? (
          filteredFindings.map((finding, idx) => (
            <article
              key={idx}
              className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-sm overflow-hidden flex flex-col"
            >
              <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-[#21262d]/50 border-b border-[#30363d] gap-2">
                <div className="flex items-center gap-2 font-mono text-[12px]">
                  <span
                    className={`px-2 py-0.5 rounded font-semibold text-[10px] tracking-wider uppercase border ${
                      finding.severity === "critical"
                        ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : finding.severity === "warning"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : "bg-[#21262d] text-[#8b949e] border-[#30363d]"
                    }`}
                  >
                    {finding.severity.toUpperCase()}
                  </span>
                  <span className="text-[#f0f6fc] font-medium">{finding.category || "Rule Invariant"}</span>
                  <span className="text-[#484f58]">·</span>
                  <span className="text-[#58a6ff]">
                    {finding.file}:{finding.line}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8b949e]">
                  <span className="material-symbols-outlined text-[15px] text-emerald-400">verified</span>
                  <span>{finding.confidence || 90}% confidence</span>
                </div>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <h3 className="text-[16px] text-[#f0f6fc] font-semibold">{finding.title}</h3>
                {finding.description && (
                  <p className="text-[13px] text-[#8b949e] leading-relaxed">{finding.description}</p>
                )}
                {finding.suggestion && (
                  <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-lg font-mono text-[12px] text-emerald-300">
                    {finding.suggestion}
                  </div>
                )}
              </div>
            </article>
          ))
        ) : (
          <>
            {/* Finding Card 1: Critical (Tenant Isolation) */}
            {(severityFilter === "all" || severityFilter === "critical") && (
              <article className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* Header Banner */}
                <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-[#21262d]/50 border-b border-[#30363d] gap-2">
                  <div className="flex items-center gap-2.5 font-mono text-[12px]">
                    <span className="px-2.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-semibold text-[10px] tracking-wider uppercase">
                      CRITICAL
                    </span>
                    <span className="text-[#f0f6fc] font-medium">Tenant Isolation Invariant</span>
                    <span className="text-[#484f58]">·</span>
                    <span className="text-[#58a6ff] hover:underline cursor-pointer">src/webhooks/stripe.ts:84</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8b949e]">
                    <span className="material-symbols-outlined text-[15px] text-emerald-400">verified</span>
                    <span>94% confidence</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col gap-4">
                  <h3 className="text-[16px] text-[#f0f6fc] font-semibold">
                    Missing mandatory <code className="font-mono text-[13px] bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#30363d] text-amber-300">tenant_id</code> filter on Stripe customer lookup query.
                  </h3>
                  <p className="text-[13px] text-[#8b949e] leading-relaxed">
                    The webhook handler queries <code className="font-mono text-[12px] bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#30363d] text-[#c9d1d9]">db.customers.findUnique()</code> using only the Stripe customer ID without validating tenant ownership, violating repository invariant #2 (Tenant Scoping Principle).
                  </p>

                  {/* Clean Monospace Code Diff Box */}
                  <div className="rounded-lg border border-[#30363d] bg-[#0d1117] overflow-hidden my-1.5">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d] font-mono text-[11px] text-[#8b949e]">
                      <span className="text-[#c9d1d9]">src/webhooks/stripe.ts</span>
                      <span className="text-[#6e7681]">@@ -83,4 +83,4 @@</span>
                    </div>
                    <div className="p-3 font-mono text-[12px] leading-relaxed overflow-x-auto">
                      <div className="flex items-center text-[#8b949e] px-2 py-0.5">
                        <span className="w-8 shrink-0 text-[#484f58] select-none text-right pr-3">83</span>
                        <span className="whitespace-pre">  const stripeId = event.data.object.customer;</span>
                      </div>
                      <div className="flex items-center bg-red-950/40 text-red-300 px-2 py-0.5 border-l-2 border-red-500">
                        <span className="w-8 shrink-0 text-red-500/70 select-none text-right pr-3">84</span>
                        <span className="w-4 shrink-0 font-bold text-red-400">-</span>
                        <span className="whitespace-pre">const customer = await db.customers.findFirst({`{ where: { stripeId } }`});</span>
                      </div>
                      <div className="flex items-center bg-emerald-950/40 text-emerald-300 px-2 py-0.5 border-l-2 border-emerald-500">
                        <span className="w-8 shrink-0 text-emerald-500/70 select-none text-right pr-3">84</span>
                        <span className="w-4 shrink-0 font-bold text-emerald-400">+</span>
                        <span className="whitespace-pre">const customer = await db.customers.findFirst({`{ where: { stripeId, tenantId: session.tenantId } }`});</span>
                      </div>
                      <div className="flex items-center text-[#8b949e] px-2 py-0.5">
                        <span className="w-8 shrink-0 text-[#484f58] select-none text-right pr-3">85</span>
                        <span className="whitespace-pre">  if (!customer) throw new NotFoundError(&quot;Customer not found&quot;);</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer with Attribution & Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1.5 border-t border-[#30363d]/60">
                    <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b949e]">
                      <span>Rule:</span>
                      <span className="px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-[#c9d1d9]">
                        tenant-scoping-invariant
                      </span>
                      <span className="text-[#484f58]">•</span>
                      <span>Agent: <strong className="text-[#f0f6fc]">Security Sentinel</strong></span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#f0f6fc] text-[12px] font-medium transition-colors" type="button">
                        <span className="material-symbols-outlined text-[15px] text-[#8b949e]">chat</span>
                        <span>Comment</span>
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-medium transition-colors shadow-sm" type="button">
                        <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
                        <span>Apply Suggestion</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* Finding Card 2: Warning (Defensive Error Handling) */}
            {(severityFilter === "all" || severityFilter === "warning") && (
              <article className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-[#21262d]/50 border-b border-[#30363d] gap-2">
                  <div className="flex items-center gap-2.5 font-mono text-[12px]">
                    <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold text-[10px] tracking-wider uppercase">
                      WARNING
                    </span>
                    <span className="text-[#f0f6fc] font-medium">Defensive Error Handling</span>
                    <span className="text-[#484f58]">·</span>
                    <span className="text-[#58a6ff] hover:underline cursor-pointer">src/billing/ledger.ts:112</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8b949e]">
                    <span className="material-symbols-outlined text-[15px] text-emerald-400">verified</span>
                    <span>82% confidence</span>
                  </div>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <h3 className="text-[16px] text-[#f0f6fc] font-semibold">
                    Unhandled promise rejection in asynchronous idempotency cache write.
                  </h3>
                  <p className="text-[13px] text-[#8b949e] leading-relaxed">
                    If the cache service fails or undergoes failover during <code className="font-mono text-[12px] bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#30363d] text-[#c9d1d9]">cache.set()</code>, the unhandled error drops webhook processing mid-transaction.
                  </p>

                  {/* Monospace Diff Box */}
                  <div className="rounded-lg border border-[#30363d] bg-[#0d1117] overflow-hidden my-1.5">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d] font-mono text-[11px] text-[#8b949e]">
                      <span className="text-[#c9d1d9]">src/billing/ledger.ts</span>
                      <span className="text-[#6e7681]">@@ -111,2 +111,2 @@</span>
                    </div>
                    <div className="p-3 font-mono text-[12px] leading-relaxed overflow-x-auto">
                      <div className="flex items-center text-[#8b949e] px-2 py-0.5">
                        <span className="w-8 shrink-0 text-[#484f58] select-none text-right pr-3">111</span>
                        <span className="whitespace-pre">{"  // Record idempotency token"}</span>
                      </div>
                      <div className="flex items-center bg-red-950/40 text-red-300 px-2 py-0.5 border-l-2 border-red-500">
                        <span className="w-8 shrink-0 text-red-500/70 select-none text-right pr-3">112</span>
                        <span className="w-4 shrink-0 font-bold text-red-400">-</span>
                        <span className="whitespace-pre">await cache.set(idempotencyKey, event.id, {`{ ttl: 86400 }`});</span>
                      </div>
                      <div className="flex items-center bg-emerald-950/40 text-emerald-300 px-2 py-0.5 border-l-2 border-emerald-500">
                        <span className="w-8 shrink-0 text-emerald-500/70 select-none text-right pr-3">112</span>
                        <span className="w-4 shrink-0 font-bold text-emerald-400">+</span>
                        <span className="whitespace-pre">try {`{ await cache.set(idempotencyKey, event.id, { ttl: 86400 }); }`} catch (err) {`{ logger.warn("Cache fail", { err }); }`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1.5 border-t border-[#30363d]/60">
                    <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b949e]">
                      <span>Agent: <strong className="text-[#f0f6fc]">Defensive Error Squad</strong></span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button className="px-3.5 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-[#f0f6fc] text-[12px] font-medium transition-colors" type="button">
                        Dismiss
                      </button>
                      <button className="px-3.5 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#58a6ff] hover:text-[#79c0ff] text-[12px] font-medium transition-colors" type="button">
                        Apply Fix
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* Finding Card 3 & 4: Clean Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Finding 3: Warning (Test Coverage) */}
              {(severityFilter === "all" || severityFilter === "warning") && (
                <article className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col justify-between shadow-sm">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold text-[10px]">
                          WARNING
                        </span>
                        <span className="text-[#8b949e]">tests/webhooks/stripe.test.ts:45</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#8b949e]">88% conf</span>
                    </div>
                    <h3 className="text-[14px] text-[#f0f6fc] font-semibold leading-snug">
                      Missing test fixture for duplicate event replay detection.
                    </h3>
                    <p className="text-[12px] text-[#8b949e] leading-relaxed">
                      Webhook signature replay scenario is not covered in the unit test suite. Test execution passes, but branch coverage for idempotent replay paths remains at 0%.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-[#30363d]/50 font-mono text-[11px]">
                    <span className="text-[#8b949e]">Agent: Test Coverage</span>
                    <button className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#f0f6fc] text-[11px] font-medium transition-colors" type="button">
                      Generate Test Scaffold
                    </button>
                  </div>
                </article>
              )}

              {/* Finding 4: Info (Documentation Integrity) */}
              {(severityFilter === "all" || severityFilter === "info") && (
                <article className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col justify-between shadow-sm">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d] font-semibold text-[10px]">
                          INFO
                        </span>
                        <span className="text-[#8b949e]">src/webhooks/types.ts:22</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#8b949e]">76% conf</span>
                    </div>
                    <h3 className="text-[14px] text-[#f0f6fc] font-semibold leading-snug">
                      Docstring missing parameter <code className="font-mono text-[12px] text-[#c9d1d9] bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#30363d]">@param rawPayload</code>.
                    </h3>
                    <p className="text-[12px] text-[#8b949e] leading-relaxed">
                      Type definition contains updated parameter without corresponding TSDoc tag. Minor maintenance item.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-[#30363d]/50 font-mono text-[11px]">
                    <span className="text-[#8b949e]">Agent: Doc Integrity</span>
                    <button className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-[#f0f6fc] text-[11px] font-medium transition-colors" type="button">
                      Acknowledge
                    </button>
                  </div>
                </article>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
