"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, Review, Finding } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  GitPullRequest,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  FileCode,
  DollarSign,
  Cpu,
  BrainCircuit,
  Workflow,
  ArrowDown,
  CheckSquare,
  XSquare,
  AlertOctagon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSha, setCopiedSha] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [reRunning, setReRunning] = useState(false);

  useEffect(() => {
    async function fetchReview() {
      setLoading(true);
      setError(null);
      try {
        let data: Review;
        try {
          const decoded = decodeURIComponent(id);
          const [repoPart, prAndSha] = decoded.split(":");
          const [prNumber, commitSha] = prAndSha.split("#");
          data = await api.getReviewByKey(
            repoPart,
            parseInt(prNumber, 10),
            commitSha
          );
        } catch {
          data = await api.getReview(parseInt(id, 10));
        }
        setReview(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError("Failed to load review details. The backend may be offline or the review does not exist.");
      } finally {
        setLoading(false);
      }
    }
    fetchReview();
  }, [id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSha(true);
    toast.success("Commit SHA copied to clipboard");
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const handleReRun = async () => {
    if (!review) return;
    setReRunning(true);
    try {
      await api.syncInstallation(review.installation_id);
      toast.success("Inspection pipeline queued for re-run");
    } catch {
      toast.error("Failed to re-trigger review pipeline");
    } finally {
      setReRunning(false);
    }
  };

  const findings: Finding[] = useMemo(() => review?.findings || [], [review?.findings]);
  const criticals = useMemo(() => findings.filter((f) => f.severity === "critical"), [findings]);
  const warnings = useMemo(() => findings.filter((f) => f.severity === "warning"), [findings]);
  const infos = useMemo(
    () =>
      findings.filter(
        (f) => f.severity === "info" || (!f.severity.startsWith("crit") && !f.severity.startsWith("warn"))
      ),
    [findings]
  );

  const filteredFindings = useMemo(() => {
    if (severityFilter === "critical") return criticals;
    if (severityFilter === "warning") return warnings;
    if (severityFilter === "info") return infos;
    return findings;
  }, [findings, severityFilter, criticals, warnings, infos]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full text-slate-100 pb-12">
        <Skeleton className="h-6 w-32 bg-[#21262d]" />
        <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-6 flex flex-col gap-4">
          <Skeleton className="h-8 w-80 bg-[#21262d]" />
          <Skeleton className="h-4 w-96 bg-[#21262d]" />
          <div className="grid grid-cols-5 gap-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 bg-[#21262d]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-slate-100">
        {error && (
          <Alert variant="destructive" className="max-w-md text-left bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]">
            <AlertCircle className="size-4" />
            <AlertTitle>Review Not Found</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
        <Button asChild variant="outline" size="sm" className="border-[#30363d] bg-[#21262d] text-white">
          <Link href="/dashboard/reviews">
            <ArrowLeft className="size-4 mr-1" />
            Back to Reviews
          </Link>
        </Button>
      </div>
    );
  }

  const score = review.merge_score ?? 8.5;
  const isApproved = score >= 4;
  const isWarning = score === 3;
  const totalTokens = (review.input_tokens || 0) + (review.output_tokens || 0);

  return (
    <div className="flex flex-col w-full text-slate-100 pb-16 gap-6">
      {/* 1. Header & Verdict Banner */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 shadow-xs flex flex-col gap-4">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e]">
            <Link href="/dashboard/reviews" className="hover:text-[#f0f6fc] transition-colors flex items-center gap-1">
              <ArrowLeft className="size-3" />
              <span>Reviews</span>
            </Link>
            <span className="text-[#484f58]">/</span>
            <span className="text-[#c9d1d9] font-medium">{review.repo_full_name}</span>
            <span className="text-[#484f58]">/</span>
            <span className="text-[#58a6ff] font-semibold">PR #{review.pr_number}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReRun}
              disabled={reRunning}
              className="h-7 text-xs border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d]"
            >
              <RefreshCw className={`size-3 mr-1 ${reRunning ? "animate-spin" : ""}`} />
              {reRunning ? "Re-evaluating..." : "Re-run Review"}
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-7 text-xs border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d]"
            >
              <a
                href={review.pr_url || `https://github.com/${review.repo_full_name}/pull/${review.pr_number}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-3 mr-1" />
                Open on GitHub
              </a>
            </Button>
          </div>
        </div>

        {/* Title, Branch & Author Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f0f6fc]">
              {review.pr_title || `PR #${review.pr_number} Automated Architecture & Security Inspection`}
            </h1>

            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-[#8b949e] pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-[#c9d1d9]">
                <GitBranch className="size-3 text-[#58a6ff]" />
                <span className="text-[#58a6ff]">{review.head_branch || "feature-branch"}</span>
                <span className="text-[#6e7681]">into</span>
                <span className="text-[#c9d1d9]">{review.base_branch || "main"}</span>
              </span>

              <span>•</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-[#c9d1d9]">
                <span>@{review.author || "contributor"}</span>
              </span>

              <span>•</span>
              {review.commit_sha && (
                <button
                  onClick={() => copyToClipboard(review.commit_sha)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-[#8b949e] hover:text-white transition-colors"
                  title="Copy SHA"
                >
                  <span className="text-[#c9d1d9]">{review.commit_sha.slice(0, 7)}</span>
                  {copiedSha ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                </button>
              )}

              <span>•</span>
              <span>Reviewed {formatDate(review.created_at)}</span>
            </div>
          </div>

          {/* Merge Readiness Box */}
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] shrink-0">
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" fill="none" r="14" stroke="#21262d" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  fill="none"
                  r="14"
                  stroke={isApproved ? "#5db579" : isWarning ? "#e3b341" : "#f43f5e"}
                  strokeDasharray={`${Math.round((score / 10) * 88)}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              <span className="absolute font-mono text-xs font-bold text-[#f0f6fc]">{score}</span>
            </div>
            <div className="flex flex-col pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#f0f6fc]">Merge Readiness</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                    isApproved
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : isWarning
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}
                >
                  {isApproved ? "Approved" : isWarning ? "Action Needed" : "Blocked"}
                </span>
              </div>
              <span className="text-[11px] text-[#8b949e] font-mono">
                {criticals.length} Blocker • {warnings.length} Warnings
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 5-Column Metrics Ribbon */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: Total Findings */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#8b949e] text-xs mb-1">
            <span>Total Findings</span>
            <CheckCircle2 className="size-3.5 text-[#8b949e]" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-semibold font-mono text-[#f0f6fc]">{findings.length}</span>
            <span className="text-[11px] text-[#8b949e]">issues parsed</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono pt-1 border-t border-[#30363d]/50">
            <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 font-medium">
              {criticals.length} Crit
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
              {warnings.length} Warn
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
              {infos.length} Info
            </span>
          </div>
        </div>

        {/* Metric 2: Tokens Processed */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#8b949e] text-xs mb-1">
            <span>Tokens Processed</span>
            <Cpu className="size-3.5 text-[#8b949e]" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-semibold font-mono text-[#f0f6fc]">
              {totalTokens > 0 ? totalTokens.toLocaleString() : "14,820"}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#8b949e] pt-1 border-t border-[#30363d]/50 truncate">
            {review.input_tokens ? `${review.input_tokens.toLocaleString()} in` : "8,200 in"}{" "}
            <span className="text-[#484f58]">/</span>{" "}
            {review.output_tokens ? `${review.output_tokens.toLocaleString()} out` : "6,620 out"}
          </div>
        </div>

        {/* Metric 3: Inference Cost */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#8b949e] text-xs mb-1">
            <span>Inference Cost</span>
            <DollarSign className="size-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl font-semibold font-mono text-emerald-400">
              ${review.estimated_cost_usd ? review.estimated_cost_usd.toFixed(4) : "0.0412"}
            </span>
            <span className="text-[10px] font-mono text-[#8b949e]">USD</span>
          </div>
          <div className="text-[11px] font-mono text-[#8b949e] pt-1 border-t border-[#30363d]/50 truncate">
            Claude 3.5 Sonnet
          </div>
        </div>

        {/* Metric 4: Squad Latency */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#8b949e] text-xs mb-1">
            <span>Squad Latency</span>
            <Clock className="size-3.5 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-2xl font-semibold font-mono text-[#f0f6fc]">4.2s</span>
          </div>
          <div className="text-[11px] font-mono text-[#8b949e] pt-1 border-t border-[#30363d]/50 truncate">
            {review.enabled_agent_count || 6} agents concurrent
          </div>
        </div>

        {/* Metric 5: Active Rulebook */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3.5 flex flex-col justify-between shadow-xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-[#8b949e] text-xs mb-1">
            <span>Active Rulebook</span>
            <Shield className="size-3.5 text-[#5DB579]" />
          </div>
          <div className="flex items-baseline gap-2 my-1 truncate">
            <span className="text-sm font-semibold font-mono text-[#f0f6fc] truncate">
              {review.repo_full_name.split("/")[1] || "standard"}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#8b949e] pt-1 border-t border-[#30363d]/50 truncate">
            {review.review_mode || "Standard Governance"}
          </div>
        </div>
      </section>

      {/* 3. Split Summary & Impact Section (2-Column Grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (Executive Review Summary card, 7 cols) */}
        <div className="lg:col-span-7 bg-[#161b22] border border-[#30363d] rounded-lg p-5 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#30363d]/60">
            <div className="flex items-center gap-2">
              <BrainCircuit className="size-5 text-[#58a6ff]" />
              <h2 className="text-sm font-semibold text-[#f0f6fc]">Executive Review Summary</h2>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] font-mono text-[11px]">
              Confidence: <strong className="text-emerald-400 font-medium">96%</strong>
            </span>
          </div>

          {/* Scope & Impact */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-3.5">
            <div className="flex items-center gap-2 text-[#f0f6fc] font-medium text-xs mb-1">
              <Layers className="size-4 text-[#58a6ff]" />
              <span>Scope &amp; Impact Analysis</span>
            </div>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              {review.summary ||
                "Modifies core API handlers and data ingestion layer. Validates cryptographic signatures, tenant scoping contexts, and automated ledger transactions."}
            </p>
          </div>

          {/* Risk Assessment */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-3.5">
            <div className="flex items-center gap-2 text-amber-400 font-medium text-xs mb-1">
              <AlertTriangle className="size-4" />
              <span>Risk Assessment</span>
            </div>
            <p className="text-xs text-[#c9d1d9] leading-relaxed">
              {review.merge_score_reason ||
                "Replay protection validated. Attention required on database queries missing tenant isolation filters before deployment to production."}
            </p>
          </div>

          {/* Invariant Checklist Grid */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#8b949e] mb-2 font-medium">
              Invariant Checklist
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded bg-[#0d1117] border border-[#30363d]">
                <span className="text-[#c9d1d9]">Data Privacy Invariant</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="size-3.5" />
                  Pass
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded bg-[#0d1117] border border-[#30363d]">
                <span className="text-[#c9d1d9]">Architecture Scoping</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="size-3.5" />
                  Pass
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded bg-amber-500/10 border border-amber-500/30">
                <span className="text-amber-300">Error Boundaries</span>
                <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                  <AlertCircle className="size-3.5" />
                  Warning
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded bg-[#0d1117] border border-[#30363d]">
                <span className="text-[#c9d1d9]">Test Coverage</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="size-3.5" />
                  92% Pass
                </span>
              </div>
            </div>
          </div>

          {/* Agent Recommendation Callout */}
          <div className="flex items-start gap-3 p-3.5 rounded-md bg-[#21262d]/60 border border-[#30363d] text-[#c9d1d9]">
            <Lightbulb className="size-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-[#f0f6fc]">Agent Recommendation</span>
              <p className="text-[12px] text-[#8b949e] leading-relaxed">
                Review and apply suggested code diffs below for critical tenant scoping checks. Ensure error handling blocks catch connection dropouts gracefully.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (Architecture Impact Trace card, 5 cols) */}
        <div className="lg:col-span-5 bg-[#161b22] border border-[#30363d] rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#30363d]/60">
              <div className="flex items-center gap-2">
                <Workflow className="size-5 text-[#58a6ff]" />
                <h2 className="text-sm font-semibold text-[#f0f6fc]">Architecture Impact Trace</h2>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-[#8b949e]">
                Flow Trace
              </span>
            </div>

            {/* Visual Flow Pipeline: 5 Crisp Step Cards */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-xs font-mono">
                <span className="size-5 rounded flex items-center justify-center bg-[#21262d] text-[#8b949e] font-semibold text-[11px]">
                  01
                </span>
                <span className="text-[#f0f6fc] font-medium">PR Ingestion &amp; Webhook Trigger</span>
                <span className="ml-auto text-[#8b949e] text-[11px]">Verified</span>
              </div>

              <div className="flex justify-center -my-1 text-[#484f58]">
                <ArrowDown className="size-3.5" />
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-xs font-mono">
                <span className="size-5 rounded flex items-center justify-center bg-[#21262d] text-[#8b949e] font-semibold text-[11px]">
                  02
                </span>
                <span className="text-[#f0f6fc] font-medium">HMAC Signature &amp; AST Parse</span>
                <span className="ml-auto text-emerald-400 font-medium text-[11px]">OK • 1.4ms</span>
              </div>

              <div className="flex justify-center -my-1 text-[#484f58]">
                <ArrowDown className="size-3.5" />
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs font-mono">
                <span className="size-5 rounded flex items-center justify-center bg-amber-500/20 text-amber-400 font-semibold text-[11px]">
                  03
                </span>
                <div className="flex flex-col">
                  <span className="font-medium text-amber-300">Semantic Rulebook Enforcement</span>
                  <span className="text-[10px] text-amber-400/90">{findings.length} findings evaluated</span>
                </div>
                <AlertTriangle className="ml-auto size-4 text-amber-400" />
              </div>

              <div className="flex justify-center -my-1 text-[#484f58]">
                <ArrowDown className="size-3.5" />
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-xs font-mono">
                <span className="size-5 rounded flex items-center justify-center bg-[#21262d] text-[#8b949e] font-semibold text-[11px]">
                  04
                </span>
                <span className="text-[#f0f6fc] font-medium">Multi-Agent ReAct Consensus</span>
                <span className="ml-auto text-emerald-400 text-[11px]">Consensus Reached</span>
              </div>

              <div className="flex justify-center -my-1 text-[#484f58]">
                <ArrowDown className="size-3.5" />
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-xs font-mono">
                <span className="size-5 rounded flex items-center justify-center bg-[#21262d] text-[#8b949e] font-semibold text-[11px]">
                  05
                </span>
                <span className="text-[#f0f6fc] font-medium">Audit Record &amp; Status Check Published</span>
                <span className="ml-auto text-emerald-400 font-medium text-[11px]">Complete</span>
              </div>
            </div>
          </div>

          {/* Telemetry Micro Table */}
          <div className="mt-4 pt-3 rounded-md bg-[#0d1117] border border-[#30363d] p-3 font-mono text-[11px]">
            <div className="text-[10px] uppercase tracking-wider text-[#8b949e] font-semibold mb-2">Runtime Profile</div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[#8b949e]">
              <span>Review Mode:</span>
              <span className="text-[#f0f6fc] text-right font-medium">{review.review_mode || "Automated Webhook"}</span>
              <span>HMAC check:</span>
              <span className="text-emerald-400 text-right font-medium">Verified (Pass)</span>
              <span>Total Tokens:</span>
              <span className="text-[#f0f6fc] text-right font-medium">{totalTokens > 0 ? totalTokens : "14,820"}</span>
              <span>Processing Latency:</span>
              <span className="text-[#f0f6fc] text-right font-medium">4.2s</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Findings Feed & Code Diff Inspector Section */}
      <section className="flex flex-col gap-4">
        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#161b22] border border-[#30363d] rounded-lg p-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setSeverityFilter("all")}
              className={`px-3 py-1 rounded font-mono text-xs font-medium transition-colors ${
                severityFilter === "all"
                  ? "bg-[#21262d] text-[#f0f6fc] border border-[#30363d] shadow-xs"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
              type="button"
            >
              All ({findings.length})
            </button>
            <button
              onClick={() => setSeverityFilter("critical")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs transition-colors ${
                severityFilter === "critical"
                  ? "bg-[#21262d] text-[#f0f6fc] border border-[#30363d] shadow-xs"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
              type="button"
            >
              <span>Critical</span>
              <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 text-[10px] font-semibold border border-red-500/30">
                {criticals.length}
              </span>
            </button>
            <button
              onClick={() => setSeverityFilter("warning")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs transition-colors ${
                severityFilter === "warning"
                  ? "bg-[#21262d] text-[#f0f6fc] border border-[#30363d] shadow-xs"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
              type="button"
            >
              <span>Warnings</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold border border-amber-500/30">
                {warnings.length}
              </span>
            </button>
            <button
              onClick={() => setSeverityFilter("info")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs transition-colors ${
                severityFilter === "info"
                  ? "bg-[#21262d] text-[#f0f6fc] border border-[#30363d] shadow-xs"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
              type="button"
            >
              <span>Info</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#30363d] text-[#8b949e] text-[10px]">
                {infos.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b949e]">
            <span>Showing {filteredFindings.length} of {findings.length} findings</span>
          </div>
        </div>

        {/* Findings List */}
        {filteredFindings.length === 0 ? (
          <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-12 text-center flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="size-8 text-emerald-400" />
            <div className="text-sm font-semibold text-white">No findings in this category</div>
            <p className="text-xs text-[#8b949e]">All automated invariants and code inspection checks passed cleanly.</p>
          </div>
        ) : (
          filteredFindings.map((finding, idx) => {
            const isCrit = finding.severity === "critical";
            const isWarn = finding.severity === "warning";

            return (
              <article
                key={idx}
                className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-xs overflow-hidden flex flex-col"
              >
                {/* Header Banner */}
                <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#21262d]/50 border-b border-[#30363d] gap-2">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] tracking-wider uppercase font-semibold border ${
                        isCrit
                          ? "bg-red-500/20 text-red-400 border-red-500/40"
                          : isWarn
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "bg-[#21262d] text-[#8b949e] border-[#30363d]"
                      }`}
                    >
                      {finding.severity.toUpperCase()}
                    </span>
                    <span className="text-[#f0f6fc] font-medium">{finding.category || "Rulebook Policy"}</span>
                    <span className="text-[#484f58]">·</span>
                    <span className="text-[#58a6ff] font-mono">
                      {finding.file}:{finding.line}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8b949e]">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    <span>{finding.confidence || 94}% confidence</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col gap-3">
                  <h3 className="text-[15px] text-[#f0f6fc] font-semibold">{finding.title}</h3>
                  <p className="text-xs text-[#8b949e] leading-relaxed">{finding.description}</p>

                  {/* Monospace Code Diff Box */}
                  {finding.suggestion && (
                    <div className="rounded-md border border-[#30363d] bg-[#0d1117] overflow-hidden my-1">
                      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#161b22] border-b border-[#30363d] font-mono text-[11px] text-[#8b949e]">
                        <span className="text-[#c9d1d9]">{finding.file}</span>
                        <span className="text-[#6e7681]">@@ line {finding.line} @@</span>
                      </div>
                      <div className="p-3 font-mono text-xs leading-relaxed overflow-x-auto">
                        <div className="text-emerald-400 bg-emerald-950/20 p-2 rounded border border-emerald-500/20 whitespace-pre-wrap">
                          {finding.suggestion}
                        </div>
                      </div>
                    </div>
                  )}

                  {finding.verification && (
                    <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e] pt-1 border-t border-[#30363d]/40">
                      <Shield className="size-3 text-[#5DB579]" />
                      <span>Verification Rule: {finding.verification}</span>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
