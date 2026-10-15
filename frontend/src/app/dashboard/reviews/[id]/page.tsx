"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, Review, Finding } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  GitPullRequest,
  GitMerge,
  GitCommit,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
  FileCode,
  Shield,
  Layers,
  Terminal,
  ExternalLink,
  Bot,
  Sparkles,
  MessageSquare,
  ListChecks,
  FileDiff,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  const [copiedDiagram, setCopiedDiagram] = useState(false);
  const [activeTab, setActiveTab] = useState<"conversation" | "checks" | "files" | "diagram">(
    "conversation"
  );

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
        setError(
          "Failed to load review details. The backend may be offline or the review does not exist."
        );
      } finally {
        setLoading(false);
      }
    }
    fetchReview();
  }, [id]);

  const copyToClipboard = (text: string, type: "sha" | "diagram") => {
    navigator.clipboard.writeText(text);
    if (type === "sha") {
      setCopiedSha(true);
      toast.success("Commit SHA copied to clipboard");
      setTimeout(() => setCopiedSha(false), 2000);
    } else {
      setCopiedDiagram(true);
      toast.success("Mermaid diagram code copied");
      setTimeout(() => setCopiedDiagram(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-6 w-32 bg-[#21262d]" />
        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-6 flex flex-col gap-4">
          <Skeleton className="h-8 w-80 bg-[#21262d]" />
          <Skeleton className="h-4 w-96 bg-[#21262d]" />
          <div className="flex gap-4 pt-4">
            <Skeleton className="h-6 w-24 bg-[#21262d]" />
            <Skeleton className="h-6 w-24 bg-[#21262d]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        {error && (
          <Alert variant="destructive" className="max-w-md text-left bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]">
            <AlertCircle className="size-4" />
            <AlertTitle>Review Not Found</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
        <Button asChild variant="outline" size="sm" className="border-[#30363d] bg-[#21262d] text-white">
          <Link href="/dashboard/reviews">
            <ArrowLeft data-icon="inline-start" />
            Back to Pull Requests
          </Link>
        </Button>
      </div>
    );
  }

  const findings: Finding[] = review.findings || [];
  const criticals = findings.filter((f) => f.severity === "critical");
  const warnings = findings.filter((f) => f.severity === "warning");
  const totalTokens = (review.input_tokens || 0) + (review.output_tokens || 0);
  const isApproved = review.merge_score && review.merge_score >= 4;
  const isWarning = review.merge_score && review.merge_score === 3;

  return (
    <div className="flex flex-col gap-5">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/reviews"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to pull requests</span>
        </Link>

        <a
          href={`https://github.com/${review.repo_full_name}/pull/${review.pr_number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[#58a6ff] hover:underline"
        >
          <span>View PR on GitHub</span>
          <ExternalLink className="size-3" />
        </a>
      </div>

      {/* GitHub PR Title & State Banner */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-2xl font-normal text-white">
            <span>Review of {review.repo_full_name}</span>{" "}
            <span className="text-muted-foreground font-light">#{review.pr_number}</span>
          </h1>
        </div>

        {/* GitHub PR Meta Row */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pb-2">
          {/* PR Status badge */}
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white ${
              review.status === "complete"
                ? "bg-[#238636]"
                : review.status === "failed"
                  ? "bg-[#da3633]"
                  : "bg-[#8957e5]"
            }`}
          >
            <GitPullRequest className="size-3.5" />
            <span className="capitalize">{review.status === "complete" ? "Open" : review.status}</span>
          </span>

          <span className="font-semibold text-[#e6edf3]">codesentinel-bot</span>
          <span>reviewed commit</span>

          {review.commit_sha && (
            <button
              onClick={() => copyToClipboard(review.commit_sha, "sha")}
              className="inline-flex items-center gap-1 rounded bg-[#21262d] px-1.5 py-0.5 font-mono text-[11px] text-[#58a6ff] border border-[#30363d] hover:bg-[#30363d]"
              title="Copy commit SHA"
            >
              <span>{review.commit_sha.slice(0, 7)}</span>
              {copiedSha ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            </button>
          )}

          <span>into <span className="font-mono bg-[#21262d] px-1.5 py-0.5 rounded text-white border border-[#30363d]">main</span></span>
          <span>·</span>
          <span>{formatDate(review.created_at)}</span>
        </div>
      </div>

      {/* GitHub Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-[#30363d] text-xs">
        <button
          onClick={() => setActiveTab("conversation")}
          className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === "conversation"
              ? "border-[#fd8c73] text-white font-semibold"
              : "border-transparent text-muted-foreground hover:text-white"
          }`}
        >
          <MessageSquare className="size-3.5" />
          <span>Conversation</span>
        </button>

        <button
          onClick={() => setActiveTab("checks")}
          className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === "checks"
              ? "border-[#fd8c73] text-white font-semibold"
              : "border-transparent text-muted-foreground hover:text-white"
          }`}
        >
          <ListChecks className="size-3.5" />
          <span>Checks</span>
          <span className="rounded-full bg-[#21262d] px-1.5 py-0 text-[10px] font-mono">
            {review.enabled_agent_count || 6}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("files")}
          className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === "files"
              ? "border-[#fd8c73] text-white font-semibold"
              : "border-transparent text-muted-foreground hover:text-white"
          }`}
        >
          <FileDiff className="size-3.5" />
          <span>Files Changed / Findings</span>
          <span className="rounded-full bg-[#21262d] px-1.5 py-0 text-[10px] font-mono">
            {findings.length}
          </span>
        </button>

        {review.diagram && (
          <button
            onClick={() => setActiveTab("diagram")}
            className={`flex items-center gap-2 px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "diagram"
                ? "border-[#fd8c73] text-white font-semibold"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <Layers className="size-3.5" />
            <span>Architecture Diagram</span>
          </button>
        )}
      </div>

      {/* Tab 1: Conversation & Bot Review Comment Box */}
      {activeTab === "conversation" && (
        <div className="flex flex-col gap-6">
          {/* GitHub Comment Bubble */}
          <div className="flex gap-3">
            {/* Bot Avatar */}
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#21262d] border border-[#30363d] text-white">
              <Bot className="size-5 text-[#58a6ff]" />
            </div>

            {/* Comment Card */}
            <div className="flex-1 rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
              {/* Comment Header */}
              <div className="flex items-center justify-between border-b border-[#30363d] bg-[#21262d] px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">codesentinel-bot</span>
                  <span className="rounded border border-[#30363d] bg-[#161b22] px-1 py-0 text-[10px] text-muted-foreground font-mono">
                    BOT
                  </span>
                  <span className="text-muted-foreground">reviewed {formatDate(review.created_at)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-[#30363d] text-xs font-mono">
                    {totalTokens.toLocaleString()} tokens
                  </Badge>
                </div>
              </div>

              {/* Comment Body */}
              <div className="p-5 flex flex-col gap-5 text-sm">
                {/* Large Merge Score Verdict Banner */}
                <div
                  className={`rounded-md border p-4 flex flex-col gap-1.5 ${
                    isApproved
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : isWarning
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : "border-[#f85149]/40 bg-[#f85149]/10 text-[#f85149]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-base">
                      {isApproved ? (
                        <CheckCircle2 className="size-5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="size-5 text-[#f85149]" />
                      )}
                      <span>
                        Merge Score: {review.merge_score !== null ? `${review.merge_score} / 5` : "Pending"} —{" "}
                        {isApproved ? "Approved" : isWarning ? "Review Suggested" : "Changes Requested"}
                      </span>
                    </div>
                  </div>
                  {review.merge_score_reason && (
                    <p className="text-xs italic leading-relaxed text-[#e6edf3]/90 pt-1">
                      &ldquo;{review.merge_score_reason}&rdquo;
                    </p>
                  )}
                </div>

                {/* Summary */}
                {review.summary && (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold text-white text-xs uppercase tracking-wider text-muted-foreground">
                      Summary of Changes
                    </h3>
                    <p className="text-xs leading-relaxed text-[#e6edf3] whitespace-pre-line bg-[#0d1117] p-4 rounded-md border border-[#30363d]">
                      {review.summary}
                    </p>
                  </div>
                )}

                {/* Findings Count Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded border border-[#30363d] bg-[#0d1117] p-3 text-center">
                    <span className="text-[11px] text-muted-foreground uppercase">Critical</span>
                    <p className="text-xl font-bold font-mono text-[#f85149]">{criticals.length}</p>
                  </div>
                  <div className="rounded border border-[#30363d] bg-[#0d1117] p-3 text-center">
                    <span className="text-[11px] text-muted-foreground uppercase">Warnings</span>
                    <p className="text-xl font-bold font-mono text-amber-400">{warnings.length}</p>
                  </div>
                  <div className="rounded border border-[#30363d] bg-[#0d1117] p-3 text-center">
                    <span className="text-[11px] text-muted-foreground uppercase">Est. Cost</span>
                    <p className="text-xl font-bold font-mono text-emerald-400">
                      ${review.estimated_cost_usd?.toFixed(4) || "0.0000"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("files")}
                    className="h-8 text-xs bg-[#238636] hover:bg-[#2ea043] text-white"
                  >
                    <FileDiff data-icon="inline-start" />
                    Inspect {findings.length} Findings in Diff
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Checks & Agent Execution List */}
      {activeTab === "checks" && (
        <div className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
          <div className="border-b border-[#30363d] bg-[#21262d] px-4 py-3">
            <h2 className="text-sm font-semibold text-white">CodeSentinel Multi-Agent Check Runs</h2>
            <p className="text-xs text-muted-foreground">
              6 specialist ReAct agents ran in parallel followed by cross-model verification.
            </p>
          </div>

          <div className="divide-y divide-[#30363d]/60 text-xs">
            {[
              { name: "Security Specialist", desc: "SQL injection, secret leaks, SSRF, IDOR check via AST", status: "passed" },
              { name: "Bug & Logic Detection", desc: "Null dereference, race conditions, type contract checks", status: "passed" },
              { name: "Style & Formatting", desc: "PEP8, naming consistency, dead code detection", status: "passed" },
              { name: "Error Handling", desc: "Unhandled exceptions, missing retry policies", status: "passed" },
              { name: "Test Coverage", desc: "Untested branch detection and mock integrity", status: "passed" },
              { name: "Comment Accuracy", desc: "Docstring mismatch and stale comment verification", status: "passed" },
              { name: "Cross-Model Verifier", desc: "Secondary independent LLM verification to minimize false-positives", status: "verified" },
            ].map((step, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 hover:bg-[#21262d]/30">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-[#e6edf3]">{step.name}</span>
                    <span className="text-muted-foreground">{step.desc}</span>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
                  Completed
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Files Changed / Diff View with Inline Annotations */}
      {activeTab === "files" && (
        <div className="flex flex-col gap-6">
          {findings.length === 0 ? (
            <div className="rounded-md border border-[#30363d] bg-[#161b22] p-12 text-center flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="size-8 text-emerald-400" />
              <div className="font-semibold text-white">No code issues detected</div>
              <p className="text-xs text-muted-foreground">All agents completed without findings for this pull request.</p>
            </div>
          ) : (
            findings.map((finding, idx) => (
              /* GitHub File Diff Box */
              <div key={idx} className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
                {/* File Header */}
                <div className="flex items-center justify-between border-b border-[#30363d] bg-[#21262d] px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <FileCode className="size-3.5 text-muted-foreground" />
                    <span className="font-semibold text-white">{finding.file}</span>
                    <span className="text-muted-foreground">:{finding.line}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase font-bold border ${
                        finding.severity === "critical"
                          ? "border-red-500/40 bg-red-500/15 text-red-400"
                          : "border-amber-500/40 bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {finding.confidence}% confidence
                    </span>
                  </div>
                </div>

                {/* Simulated Diff Gutter with Inline AI Review Comment */}
                <div className="bg-[#0d1117] font-mono text-xs">
                  {/* Context Line */}
                  <div className="flex px-4 py-1 text-muted-foreground bg-[#0d1117] border-b border-[#30363d]/40">
                    <span className="w-12 select-none text-muted-foreground/60">{Math.max(1, finding.line - 1)}</span>
                    <span className="w-12 select-none text-muted-foreground/60">{Math.max(1, finding.line - 1)}</span>
                    <span>@@ line {finding.line} in {finding.file} @@</span>
                  </div>

                  {/* Offending Line */}
                  <div className="flex px-4 py-1.5 bg-[#f85149]/15 text-[#f85149] border-b border-[#30363d]/40">
                    <span className="w-12 select-none">{finding.line}</span>
                    <span className="w-12 select-none"></span>
                    <span className="select-none font-bold mr-2">-</span>
                    <span># Code flagged on line {finding.line}</span>
                  </div>

                  {/* Inline Review Comment Anchor Box */}
                  <div className="p-4 bg-[#161b22] border-b border-[#30363d] flex gap-3 font-sans">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#21262d] border border-[#30363d]">
                      <Bot className="size-4 text-[#58a6ff]" />
                    </div>

                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-white">codesentinel-bot</span>
                          <span className="text-muted-foreground font-mono text-[11px]">{finding.title}</span>
                        </div>
                        {finding.verification === "verified" && (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle2 className="size-3" />
                            Verified by LLM
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#e6edf3] leading-relaxed">
                        {finding.description}
                      </p>

                      {/* Suggested Fix Diff */}
                      {finding.suggestion && (
                        <div className="mt-2 rounded border border-[#30363d] bg-[#0d1117] overflow-hidden">
                          <div className="border-b border-[#30363d] bg-[#21262d] px-3 py-1 text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                            <span>Suggested Change</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(finding.suggestion);
                                toast.success("Suggestion copied to clipboard");
                              }}
                              className="hover:text-white transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="p-3 font-mono text-xs text-emerald-400 whitespace-pre-wrap">
                            {`+ ${finding.suggestion}`}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Mermaid Architecture Diagram */}
      {activeTab === "diagram" && review.diagram && (
        <div className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#30363d] bg-[#21262d] px-4 py-2.5">
            <span className="text-xs font-semibold text-white">Architecture Flow Impact</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(review.diagram, "diagram")}
              className="h-7 text-xs border-[#30363d] bg-[#21262d] text-white hover:bg-[#30363d]"
            >
              {copiedDiagram ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              <span>{copiedDiagram ? "Copied" : "Copy Code"}</span>
            </Button>
          </div>
          <div className="p-6 bg-[#0d1117]">
            <pre className="overflow-x-auto font-mono text-xs text-[#58a6ff] leading-relaxed p-4 rounded border border-[#30363d] bg-[#161b22]">
              {review.diagram}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
