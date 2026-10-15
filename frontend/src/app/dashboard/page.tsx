"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, Review } from "@/lib/api";
import { formatDate, scoreBadgeClasses, scoreColor } from "@/lib/utils";
import {
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Shield,
  Coins,
  Cpu,
  Clock,
  Sparkles,
  GitBranch,
  FileCode,
  Tag,
  Star,
  BookMarked,
  Terminal,
  Activity,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.listReviews({ limit: 8 });
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to connect to backend: ${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const completed = reviews.filter((r) => r.status === "complete").length;
  const failed = reviews.filter((r) => r.status === "failed").length;
  const scoredReviews = reviews.filter((r) => r.merge_score !== null);
  const avgScore =
    scoredReviews.length > 0
      ? (
          scoredReviews.reduce((sum, r) => sum + (r.merge_score || 0), 0) /
          scoredReviews.length
        ).toFixed(1)
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner & Repo Branch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-xs font-semibold text-[#e6edf3]">
            <GitBranch className="size-3.5 text-muted-foreground" />
            <span>main</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-[11px] text-[#e6edf3]">
              {total} total reviews
            </span>
            <span>·</span>
            <span className="font-mono text-[11px] text-emerald-400">
              {completed} verified
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="h-8 text-xs border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d] hover:text-white"
          >
            <RefreshCw
              data-icon="inline-start"
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Syncing..." : "Sync"}
          </Button>

          <Button asChild size="sm" className="h-8 text-xs bg-[#238636] hover:bg-[#2ea043] text-white">
            <Link href="/dashboard/reviews">
              <GitPullRequest data-icon="inline-start" />
              Open Pull Requests
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]">
          <AlertTriangle className="size-4" />
          <AlertTitle>API Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* GitHub Repo Grid Layout: Main Activity (2/3) + Sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metrics & PR Stream (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3.5 flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Total PRs
              </span>
              <span className="text-2xl font-bold font-mono text-white tabular-nums">
                {total}
              </span>
              <span className="text-[10px] text-muted-foreground">Across connected repos</span>
            </div>

            <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3.5 flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Completed
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                {completed}
              </span>
              <span className="text-[10px] text-muted-foreground">Checks passed</span>
            </div>

            <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3.5 flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Failed / Retried
              </span>
              <span className="text-2xl font-bold font-mono text-[#f85149] tabular-nums">
                {failed}
              </span>
              <span className="text-[10px] text-muted-foreground">Issues found</span>
            </div>

            <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3.5 flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Avg Rating
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                  {avgScore || "—"}
                </span>
                <span className="text-[11px] text-muted-foreground">/ 5</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Merge confidence</span>
            </div>
          </div>

          {/* Recent Pull Request Reviews (GitHub PR View) */}
          <div className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
            {/* GitHub Header bar */}
            <div className="flex items-center justify-between border-b border-[#30363d] bg-[#21262d] px-4 py-3">
              <div className="flex items-center gap-2">
                <GitPullRequest className="size-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  Recent Evaluated Pull Requests
                </span>
              </div>
              <Link
                href="/dashboard/reviews"
                className="text-xs text-[#58a6ff] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="size-3" />
              </Link>
            </div>

            {loading ? (
              <div className="flex flex-col divide-y divide-[#30363d]/60 p-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-6 rounded-full bg-[#21262d]" />
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-4 w-56 bg-[#21262d]" />
                        <Skeleton className="h-3 w-32 bg-[#21262d]" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 bg-[#21262d]" />
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
                <GitPullRequest className="size-8 text-muted-foreground" />
                <div className="text-sm font-semibold text-white">No pull requests reviewed yet</div>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Install the GitHub App and open a pull request in your repository to see live AI agent evaluations.
                </p>
                <Button asChild size="sm" className="mt-3 text-xs bg-[#238636] hover:bg-[#2ea043] text-white">
                  <Link href="/dashboard/repositories">Connect Repositories</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#30363d]/60">
                {reviews.map((review) => {
                  const tokenTotal = (review.input_tokens || 0) + (review.output_tokens || 0);
                  const isApproved = review.merge_score && review.merge_score >= 4;
                  const isWarning = review.merge_score && review.merge_score === 3;

                  return (
                    <Link
                      key={review.id}
                      href={`/dashboard/reviews/${review.id}`}
                      className="group flex items-start justify-between p-4 transition-colors hover:bg-[#21262d]/50"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Status Icon */}
                        <div className="mt-0.5 shrink-0">
                          {review.status === "complete" ? (
                            <GitPullRequest className="size-4 text-emerald-400" />
                          ) : review.status === "failed" ? (
                            <AlertCircle className="size-4 text-[#f85149]" />
                          ) : (
                            <Clock className="size-4 text-amber-400" />
                          )}
                        </div>

                        {/* PR Meta */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors">
                              {review.repo_full_name}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              #{review.pr_number}
                            </span>

                            {/* Score Tag */}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border ${
                                isApproved
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                                  : isWarning
                                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                                    : "border-red-500/40 bg-red-500/10 text-red-400"
                              }`}
                            >
                              Score: {review.merge_score !== null ? `${review.merge_score}/5` : "Pending"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {review.commit_sha && (
                              <span className="rounded bg-[#21262d] px-1.5 py-0.5 font-mono text-[11px] text-[#e6edf3] border border-[#30363d]">
                                {review.commit_sha.slice(0, 7)}
                              </span>
                            )}
                            <span>·</span>
                            <span>{review.findings?.length || 0} findings</span>
                            <span>·</span>
                            <span className="font-mono text-[11px]">
                              {tokenTotal > 0
                                ? `${(tokenTotal / 1000).toFixed(1)}k tokens`
                                : "0 tokens"}
                            </span>
                            <span>·</span>
                            <span>{formatDate(review.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: GitHub Repository Sidebar (1 col) */}
        <div className="flex flex-col gap-5">
          {/* About Section */}
          <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              About CodeSentinel
            </h2>
            <p className="text-xs text-[#e6edf3] leading-relaxed">
              Autonomous multi-agent code analysis for pull requests. 6 ReAct agents inspect security, logic bugs, style, and test coverage concurrently with cross-model verification.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {["ai-code-review", "langgraph", "fastapi", "react-agents", "pgvector"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#30363d] bg-[#21262d] px-2 py-0.5 text-[10px] text-[#58a6ff] hover:bg-[#30363d] cursor-pointer transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Active Agents Checklist */}
          <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Agent Pipeline Status</span>
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  <span>Security Agent</span>
                </span>
                <span className="font-mono text-[10px] text-[#e6edf3]">AST + Secrets</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  <span>Bug & Logic Agent</span>
                </span>
                <span className="font-mono text-[10px] text-[#e6edf3]">Data-flow</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  <span>Style & Conventions</span>
                </span>
                <span className="font-mono text-[10px] text-[#e6edf3]">PEP8 / Clean Code</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  <span>Error Handling</span>
                </span>
                <span className="font-mono text-[10px] text-[#e6edf3]">Exceptions</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  <span>Test Coverage</span>
                </span>
                <span className="font-mono text-[10px] text-[#e6edf3]">Branches</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  <span>Cross-Model Verifier</span>
                </span>
                <span className="font-mono text-[10px] text-emerald-400 font-semibold">Active</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-white">Repository Settings</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Configure confidence thresholds, maximum findings, or disable specific agents in your config.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full text-xs border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d]">
              <Link href="/dashboard/settings">
                <Settings data-icon="inline-start" />
                Configure Rules
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
