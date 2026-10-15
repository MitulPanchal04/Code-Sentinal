"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, Review } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  GitPullRequest,
  GitMerge,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  Shield,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  const statusFilter = searchParams.get("status") || "all";
  const repoFilter = searchParams.get("repo") || "";

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await api.listReviews({
          repo: repoFilter || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
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
    [repoFilter, statusFilter]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set("status", value);
    else params.delete("status");
    router.push(`/dashboard/reviews?${params.toString()}`);
  };

  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    const q = searchQuery.toLowerCase();
    return reviews.filter(
      (r) =>
        r.repo_full_name.toLowerCase().includes(q) ||
        String(r.pr_number).includes(q) ||
        (r.commit_sha && r.commit_sha.toLowerCase().includes(q))
    );
  }, [reviews, searchQuery]);

  const completedCount = reviews.filter((r) => r.status === "complete").length;
  const failedCount = reviews.filter((r) => r.status === "failed").length;

  return (
    <div className="flex flex-col gap-4">
      {/* GitHub PR Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          {/* GitHub Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="is:pr is:open review:all ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-9 text-xs font-mono border-[#30363d] bg-[#0d1117] text-[#e6edf3] focus-visible:ring-1 focus-visible:ring-[#58a6ff]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="h-8 text-xs border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d]"
          >
            <RefreshCw
              data-icon="inline-start"
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Syncing..." : "Sync PRs"}
          </Button>

          <Button asChild size="sm" className="h-8 text-xs bg-[#238636] hover:bg-[#2ea043] text-white">
            <a
              href={
                process.env.NEXT_PUBLIC_GITHUB_APP_URL ||
                "https://github.com/apps/review-x/installations/new"
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              Configure GitHub App
            </a>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]">
          <AlertCircle className="size-4" />
          <AlertTitle>Error loading reviews</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* GitHub Pull Requests Table Box */}
      <div className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
        {/* Table Header: Open/Closed Tabs & Controls */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#30363d] bg-[#21262d] px-4 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleStatusChange("all")}
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                statusFilter === "all" ? "text-white font-semibold" : "hover:text-white"
              }`}
            >
              <GitPullRequest className="size-4 text-emerald-400" />
              <span>{total} Total Reviews</span>
            </button>

            <button
              onClick={() => handleStatusChange("complete")}
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                statusFilter === "complete" ? "text-white font-semibold" : "hover:text-white"
              }`}
            >
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>{completedCount} Completed</span>
            </button>

            {failedCount > 0 && (
              <button
                onClick={() => handleStatusChange("failed")}
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                  statusFilter === "failed" ? "text-white font-semibold" : "hover:text-white"
                }`}
              >
                <AlertCircle className="size-4 text-[#f85149]" />
                <span>{failedCount} Failed</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Sort: Recently evaluated ▾</span>
          </div>
        </div>

        {/* PR Rows */}
        {loading ? (
          <div className="flex flex-col divide-y divide-[#30363d]/60 p-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-5 rounded-full bg-[#21262d]" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-64 bg-[#21262d]" />
                    <Skeleton className="h-3 w-40 bg-[#21262d]" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24 bg-[#21262d]" />
              </div>
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
            <GitPullRequest className="size-8 text-muted-foreground" />
            <div className="text-sm font-semibold text-white">No pull requests matching filters</div>
            <p className="max-w-sm text-xs text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No reviews match your search query or status filter."
                : "Open a pull request in your GitHub repository to trigger the review bot."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#30363d]/60">
            {filteredReviews.map((review) => {
              const totalTokens = (review.input_tokens || 0) + (review.output_tokens || 0);
              const findings = review.findings || [];
              const criticals = findings.filter((f) => f.severity === "critical").length;
              const warnings = findings.filter((f) => f.severity === "warning").length;
              const isApproved = review.merge_score && review.merge_score >= 4;
              const isWarning = review.merge_score && review.merge_score === 3;

              return (
                <div
                  key={review.id}
                  className="group flex items-start justify-between p-4 transition-colors hover:bg-[#21262d]/40"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Status icon */}
                    <div className="mt-1 shrink-0">
                      {review.status === "complete" ? (
                        <GitPullRequest className="size-4 text-emerald-400" />
                      ) : review.status === "failed" ? (
                        <AlertCircle className="size-4 text-[#f85149]" />
                      ) : (
                        <Clock className="size-4 text-amber-400" />
                      )}
                    </div>

                    {/* PR Info */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/reviews/${review.id}`}
                          className="font-semibold text-sm text-[#e6edf3] hover:text-[#58a6ff] hover:underline transition-colors"
                        >
                          {review.repo_full_name} #{review.pr_number}
                        </Link>

                        {/* GitHub Labels */}
                        {criticals > 0 && (
                          <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0 text-[10px] font-mono font-medium text-red-400">
                            {criticals} critical
                          </span>
                        )}
                        {warnings > 0 && (
                          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0 text-[10px] font-mono font-medium text-amber-400">
                            {warnings} warning
                          </span>
                        )}
                        {findings.length === 0 && review.status === "complete" && (
                          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0 text-[10px] font-mono font-medium text-emerald-400">
                            clean
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono text-[11px]">
                          #{review.pr_number}
                        </span>
                        <span>opened on {formatDate(review.created_at)}</span>
                        {review.commit_sha && (
                          <>
                            <span>·</span>
                            <span className="rounded bg-[#21262d] px-1.5 py-0.5 font-mono text-[11px] text-[#e6edf3] border border-[#30363d]">
                              {review.commit_sha.slice(0, 7)}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span className="font-mono text-[11px]">
                          {totalTokens > 0
                            ? `${(totalTokens / 1000).toFixed(1)}k tokens`
                            : "0 tokens"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Score Pill & Link */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-mono font-semibold border ${
                        isApproved
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                          : isWarning
                            ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                            : "border-red-500/40 bg-red-500/15 text-red-400"
                      }`}
                    >
                      {review.merge_score !== null ? `${review.merge_score}/5` : "—"}
                    </span>

                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-white hover:bg-[#30363d]">
                      <Link href={`/dashboard/reviews/${review.id}`}>
                        Inspect
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
