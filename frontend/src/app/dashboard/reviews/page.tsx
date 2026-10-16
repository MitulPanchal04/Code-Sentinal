"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatDate, scoreColor, reviewStatusBadge, reviewStatusLabel, prStateBadge } from "@/lib/utils";
import { Loader2, RefreshCw, AlertTriangle, GitPullRequest, RotateCcw, CheckCircle2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reviews, setReviews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const statusFilter = searchParams.get("status") || "";
  const repoFilter = searchParams.get("repo") || "";

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.listReviews({
        repo: repoFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      setReviews(data.reviews);
      setTotal(data.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`API error: ${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repoFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-poll while any review is queued or in progress
  useEffect(() => {
    const hasPending = reviews.some(
      (r) => r.status === "pending" || r.status === "running"
    );
    if (!hasPending) return;
    const timer = setInterval(() => {
      fetchData(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [reviews, fetchData]);

  const handleRetry = async (reviewId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryingId(reviewId);
    setActionMessage(null);
    try {
      await api.retryReview(reviewId);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, status: "pending", error_message: null } : r
        )
      );
      setActionMessage(`Review #${reviewId} queued for analysis.`);
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to retry review #${reviewId}: ${msg}`);
    } finally {
      setRetryingId(null);
    }
  };

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    router.push(`/dashboard/reviews?${params.toString()}`);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setError(null);
    try {
      const data = await api.listInstallations();
      const ids = [
        ...new Set((data.installations || []).map((i) => i.installation_id)),
      ];
      if (ids.length === 0) {
        setSyncMessage("No connected repositories to sync.");
        return;
      }
      await Promise.all(ids.map((id) => api.syncInstallation(id)));
      setSyncMessage(
        "Sync queued — open PRs will appear here shortly. Hit Refresh to update."
      );
      setTimeout(() => fetchData(true), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Sync failed: ${msg}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pull Requests &amp; Reviews ({total})</h2>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            <GitPullRequest className={`h-4 w-4 ${syncing ? "animate-pulse" : ""}`} />
            {syncing ? "Syncing…" : "Sync PRs"}
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <select
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="not_reviewed">Not reviewed</option>
            <option value="pending">Queued</option>
            <option value="running">Reviewing</option>
            <option value="complete">Reviewed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <p className="text-sm text-yellow-500">{error}</p>
        </div>
      )}

      {syncMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <GitPullRequest className="h-5 w-5 text-blue-500" />
          <p className="text-sm text-blue-500">{syncMessage}</p>
        </div>
      )}

      {actionMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <p className="text-sm text-emerald-500">{actionMessage}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        {reviews.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-muted-foreground">No pull requests found.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click &quot;Sync PRs&quot; to import existing open PRs, then press
              &quot;Review PR&quot; on any row to start an AI review.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="px-6 py-3 font-medium">Score</th>
                <th className="px-6 py-3 font-medium">Repository</th>
                <th className="px-6 py-3 font-medium">PR</th>
                <th className="px-6 py-3 font-medium">State</th>
                <th className="px-6 py-3 font-medium">Findings</th>
                <th className="px-6 py-3 font-medium">Tokens</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reviews.map((review) => (
                <tr
                  key={review.id}
                  onClick={() => router.push(`/dashboard/reviews/${review.id}`)}
                  className="cursor-pointer hover:bg-accent/50"
                >
                  <td className="px-6 py-4">
                    <span
                      className={`text-lg font-bold ${scoreColor(review.merge_score || 0)}`}
                    >
                      {review.merge_score || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {review.repo_full_name}
                  </td>
                  <td className="max-w-[220px] px-6 py-4 text-sm">
                    <div>#{review.pr_number}</div>
                    {review.pr_title && (
                      <div className="truncate text-xs text-muted-foreground" title={review.pr_title}>
                        {review.pr_title}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {review.pr_state && (
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${prStateBadge(review.pr_state)}`}
                      >
                        {review.pr_state}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {review.status === "not_reviewed"
                      ? "—"
                      : review.findings?.length || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {(() => {
                      const total = (review.input_tokens || 0) + (review.output_tokens || 0);
                      if (!total) return "—";
                      return (
                        <span title={`↑${(review.input_tokens||0).toLocaleString()} in / ↓${(review.output_tokens||0).toLocaleString()} out`}>
                          {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${reviewStatusBadge(review.status)}`}
                    >
                      {reviewStatusLabel(review.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDate(review.pr_created_at || review.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {review.pr_state === "closed" || review.pr_state === "merged" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <button
                        onClick={(e) => handleRetry(review.id, e)}
                        disabled={
                          retryingId === review.id ||
                          review.status === "pending" ||
                          review.status === "running"
                        }
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                        title={
                          review.status === "failed"
                            ? "Retry failed review"
                            : review.status === "not_reviewed"
                            ? "Start AI review for this PR"
                            : "Run another review"
                        }
                      >
                        <RotateCcw
                          className={`h-3 w-3 ${
                            retryingId === review.id ||
                            review.status === "pending" ||
                            review.status === "running"
                              ? "animate-spin"
                              : ""
                          }`}
                        />
                        {retryingId === review.id
                          ? "Queuing…"
                          : review.status === "pending"
                          ? "Queued…"
                          : review.status === "running"
                          ? "Reviewing…"
                          : review.status === "failed"
                          ? "Retry Review"
                          : review.status === "not_reviewed"
                          ? "Review PR"
                          : "Review Again"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
