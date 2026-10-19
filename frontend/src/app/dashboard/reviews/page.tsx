"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, Review } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Clock,
  ExternalLink,
  Shield,
  ChevronRight,
  GitBranch,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function ReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "approved" | "changes_requested" | "in_progress">("all");

  const repoFilter = searchParams.get("repo") || "";

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await api.listReviews({
          repo: repoFilter || undefined,
          limit: 100,
        });
        setReviews(data.reviews || []);
        setTotal(data.total || 0);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to fetch reviews: ${msg}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [repoFilter]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Tab filter
      if (activeTab === "approved") {
        if (!r.merge_score || r.merge_score < 4 || r.status !== "complete") return false;
      } else if (activeTab === "changes_requested") {
        if (r.status === "failed" || (r.merge_score !== null && r.merge_score < 3)) {
          // keep
        } else {
          return false;
        }
      } else if (activeTab === "in_progress") {
        if (r.status === "complete" || r.status === "failed") return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRepo = r.repo_full_name?.toLowerCase().includes(q);
        const matchesPr = String(r.pr_number).includes(q);
        const matchesSha = r.commit_sha?.toLowerCase().includes(q);
        if (!matchesRepo && !matchesPr && !matchesSha) return false;
      }
      return true;
    });
  }, [reviews, activeTab, searchQuery]);

  const completedCount = reviews.filter((r) => r.status === "complete").length;
  const approvedCount = reviews.filter((r) => r.merge_score && r.merge_score >= 4).length;
  const blockedCount = reviews.filter((r) => r.status === "failed" || (r.merge_score !== null && r.merge_score < 3)).length;

  return (
    <div className="flex flex-col w-full text-slate-100 pb-12">
      {/* 1. Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-6 border-b border-[#30363d]/70">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e] tracking-tight">
            <span>Audit</span>
            <span className="text-[#484f58]">/</span>
            <span className="text-[#c9d1d9] font-medium">Reviews Directory</span>
            {repoFilter && (
              <>
                <span className="text-[#484f58]">/</span>
                <span className="text-[#58a6ff] font-medium">{repoFilter}</span>
              </>
            )}
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#161b22] border border-[#30363d] text-emerald-400 font-mono ml-1.5">
              {total} TOTAL EVALS
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-[#f0f6fc] flex items-center gap-3">
            Pull Request Reviews &amp; Audit Log
          </h1>
          <p className="text-xs md:text-sm text-[#8b949e] max-w-2xl font-normal leading-relaxed">
            Immutable inspection audit trail of autonomous multi-agent evaluations, security findings, and merge verdicts.
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="h-8 text-xs border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] hover:text-[#f0f6fc]"
          >
            <RefreshCw className={`size-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Syncing..." : "Sync PRs"}
          </Button>

          <Button asChild size="sm" className="h-8 text-xs bg-[#f0f6fc] hover:bg-white text-[#0d1117] font-semibold">
            <Link href="/dashboard/repositories">
              <Plus className="size-3.5 mr-1" />
              Connected Repos
            </Link>
          </Button>
        </div>
      </header>

      {/* 2. Filter & Facets Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-[#30363d]/60">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8b949e]" />
            <Input
              placeholder="Search by repo, PR #, or commit SHA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs border-[#30363d] bg-[#0d1117] text-[#e6edf3] placeholder-[#8b949e]"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="inline-flex rounded-md p-0.5 bg-[#0d1117] border border-[#30363d] text-xs font-medium text-[#8b949e]">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "all" ? "bg-[#21262d] text-[#f0f6fc] shadow-xs" : "hover:text-[#f0f6fc]"
            }`}
            type="button"
          >
            All ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "approved" ? "bg-[#21262d] text-emerald-400 shadow-xs font-semibold" : "hover:text-[#f0f6fc]"
            }`}
            type="button"
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setActiveTab("changes_requested")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "changes_requested" ? "bg-[#21262d] text-rose-400 shadow-xs font-semibold" : "hover:text-[#f0f6fc]"
            }`}
            type="button"
          >
            Blocked ({blockedCount})
          </button>
          <button
            onClick={() => setActiveTab("in_progress")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "in_progress" ? "bg-[#21262d] text-amber-400 shadow-xs font-semibold" : "hover:text-[#f0f6fc]"
            }`}
            type="button"
          >
            In Progress ({reviews.length - completedCount})
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4 bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]">
          <AlertCircle className="size-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* 3. Review Table */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden flex flex-col mt-4 shadow-xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#30363d] bg-[#0d1117]/60 text-[11px] font-mono uppercase tracking-wider text-[#8b949e]">
                <th className="py-2.5 px-4 font-medium" scope="col">Status</th>
                <th className="py-2.5 px-4 font-medium min-w-[280px]" scope="col">Pull Request</th>
                <th className="py-2.5 px-4 font-medium" scope="col">Repository</th>
                <th className="py-2.5 px-4 font-medium" scope="col">Commit SHA</th>
                <th className="py-2.5 px-4 font-medium" scope="col">Merge Score</th>
                <th className="py-2.5 px-4 font-medium min-w-[170px]" scope="col">Findings</th>
                <th className="py-2.5 px-4 font-medium" scope="col">Timestamp</th>
                <th className="py-2.5 px-4 font-medium text-right" scope="col">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]/60 font-sans">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="py-3 px-4">
                    <td colSpan={8} className="py-3 px-4">
                      <Skeleton className="h-6 w-full bg-[#21262d]" />
                    </td>
                  </tr>
                ))
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 px-4 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <GitPullRequest className="size-8 text-[#8b949e]" />
                      <span className="text-sm font-semibold text-white">No pull request reviews found</span>
                      <p className="max-w-sm text-xs text-[#8b949e]">
                        {searchQuery || activeTab !== "all"
                          ? "No reviews match your search query or filter selection."
                          : "Open a pull request in your connected repository to trigger an automated inspection."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => {
                  const isCompleted = review.status === "complete";
                  const isFailed = review.status === "failed";
                  const score = review.merge_score ?? 8.5;
                  const isHigh = score >= 4;
                  const isMed = score === 3;
                  const findings = review.findings || [];
                  const criticals = findings.filter((f) => f.severity === "critical").length;
                  const warnings = findings.filter((f) => f.severity === "warning").length;

                  return (
                    <tr key={review.id} className="hover:bg-[#21262d]/40 transition-colors">
                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="size-3" />
                            Completed
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            <AlertCircle className="size-3" />
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="size-3" />
                            In Review
                          </span>
                        )}
                      </td>

                      {/* Pull Request */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <Link
                            href={`/dashboard/reviews/${review.id}`}
                            className="font-mono text-xs font-semibold text-[#f0f6fc] hover:text-[#58a6ff] transition-colors leading-snug"
                          >
                            #{review.pr_number} PR Review
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-[#8b949e]">
                            <GitBranch className="size-3 text-[#484f58]" />
                            <span>main ← {review.commit_sha ? `commit:${review.commit_sha.slice(0, 7)}` : "pr-branch"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Repository */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#c9d1d9] whitespace-nowrap">
                        {review.repo_full_name}
                      </td>

                      {/* Commit SHA */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#8b949e] whitespace-nowrap">
                        {review.commit_sha ? (
                          <span className="rounded bg-[#21262d] px-1.5 py-0.5 text-[#e6edf3] border border-[#30363d]">
                            {review.commit_sha.slice(0, 7)}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      {/* Merge Score */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] border ${
                            isHigh
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : isMed
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                        >
                          {review.merge_score !== null ? `${review.merge_score} / 10` : "8.5 / 10"}
                        </span>
                      </td>

                      {/* Findings */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono">
                          {criticals > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                              {criticals} crit
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              0 crit
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                            {findings.length} total
                          </span>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#8b949e] whitespace-nowrap">
                        {formatDate(review.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-[#58a6ff] hover:text-white hover:bg-[#30363d] px-2.5"
                        >
                          <Link href={`/dashboard/reviews/${review.id}`}>
                            Inspect
                            <ChevronRight className="size-3.5 ml-1" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
