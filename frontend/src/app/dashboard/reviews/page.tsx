"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, Review, PublicConfig, TelemetryResponse } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface ReviewRowItem {
  id: string | number;
  pr_number: number;
  pr_title: string;
  repo_full_name: string;
  branch_head: string;
  branch_base: string;
  sender_login: string;
  commit_sha: string;
  verdict: "Merge Ready" | "In Progress" | "Blocked" | "Changes Req";
  merge_score: string;
  findings: { crit?: number; warn?: number; info?: number };
  progress?: { completed_agents?: number; total_agents?: number; current_step?: string };
  cost_and_tokens: string;
  completed_ago: string;
}

function ReviewsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryResponse | null>(null);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [repoFilter, setRepoFilter] = useState(searchParams.get("repo") || "all");
  const [verdictFilter, setVerdictFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<"none" | "attention" | "blocked" | "mine">("none");

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [reviewData, configData, telemetryData] = await Promise.allSettled([
        api.listReviews({
          repo: repoFilter !== "all" ? repoFilter : undefined,
          limit: 100,
        }),
        api.getPublicConfig(),
        api.getTelemetry(repoFilter !== "all" ? repoFilter : undefined),
      ]);

      if (reviewData.status === "fulfilled") {
        setReviews(reviewData.value.reviews || []);
      }
      if (configData.status === "fulfilled") {
        setPublicConfig(configData.value);
      }
      if (telemetryData.status === "fulfilled") {
        setTelemetry(telemetryData.value);
      }
    } catch (err: unknown) {
      console.warn("Could not fetch reviews from backend:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repoFilter]);

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
      fetchData(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [reviews, fetchData]);

  const displayRows: ReviewRowItem[] = useMemo(() => {
    if (reviews.length === 0) return [];

    return reviews.map((r) => {
      let verdict: ReviewRowItem["verdict"];
      if (r.verdict === "merge_ready") {
        verdict = "Merge Ready";
      } else if (r.verdict === "in_progress") {
        verdict = "In Progress";
      } else if (r.verdict === "blocked") {
        verdict = "Blocked";
      } else if (r.verdict === "changes_requested") {
        verdict = "Changes Req";
      } else {
        const isBlocked = r.status === "failed" || (r.merge_score !== null && r.merge_score < 3);
        const isMergeReady = (r.merge_score !== null && r.merge_score >= 4) && r.status === "complete";
        const isInProg = r.status === "in_progress" || r.status === "pending";
        verdict = isBlocked
          ? "Blocked"
          : isMergeReady
          ? "Merge Ready"
          : isInProg
          ? "In Progress"
          : "Changes Req";
      }

      const critCount = r.findings?.filter((f) => f.severity === "critical").length || 0;
      const warnCount = r.findings?.filter((f) => f.severity === "warning").length || 0;
      const infoCount = r.findings?.filter((f) => f.severity === "info").length || 0;

      const totalTokens = (r.input_tokens || 0) + (r.output_tokens || 0);
      const costStr = r.estimated_cost_usd != null && r.estimated_cost_usd > 0
        ? `$${r.estimated_cost_usd.toFixed(3)}`
        : "$0.00";
      const tokenStr = totalTokens > 0 ? `${(totalTokens / 1000).toFixed(1)}k` : "0k";

      return {
        id: r.id,
        pr_number: r.pr_number,
        pr_title: r.pr_title || `Pull Request #${r.pr_number}`,
        repo_full_name: r.repo_full_name,
        branch_head: r.head_branch || "feature",
        branch_base: r.base_branch || "main",
        sender_login: r.author || "dev",
        commit_sha: r.commit_sha ? r.commit_sha.substring(0, 7) : "abcdef",
        verdict,
        merge_score: verdict === "In Progress"
          ? "Evaluating..."
          : r.merge_score !== null
          ? `${(r.merge_score * 2).toFixed(1)} / 10`
          : "—",
        findings: {
          crit: critCount || undefined,
          warn: warnCount || undefined,
          info: infoCount || undefined,
        },
        progress: r.progress,
        cost_and_tokens: verdict === "In Progress" ? "Running..." : `${costStr} • ${tokenStr}`,
        completed_ago: formatDate(r.created_at),
      };
    });
  }, [reviews]);

  const availableRepos = useMemo(() => {
    const set = new Set<string>();
    reviews.forEach((r) => {
      if (r.repo_full_name) set.add(r.repo_full_name);
    });
    return Array.from(set);
  }, [reviews]);

  const availableAuthors = useMemo(() => {
    const set = new Set<string>();
    reviews.forEach((r) => {
      if (r.author) set.add(r.author);
    });
    return Array.from(set);
  }, [reviews]);

  const attentionCount = useMemo(
    () => displayRows.filter((r) => r.verdict === "Changes Req" || r.verdict === "Blocked").length,
    [displayRows]
  );

  const blockedCount = useMemo(
    () => displayRows.filter((r) => r.verdict === "Blocked").length,
    [displayRows]
  );

  const filteredRows = useMemo(() => {
    return displayRows.filter((row) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = row.pr_title.toLowerCase().includes(q);
        const matchesPr = String(row.pr_number).includes(q);
        const matchesRepo = row.repo_full_name.toLowerCase().includes(q);
        const matchesSha = row.commit_sha.toLowerCase().includes(q);
        if (!matchesTitle && !matchesPr && !matchesRepo && !matchesSha) return false;
      }
      if (repoFilter !== "all" && row.repo_full_name !== repoFilter) return false;
      if (verdictFilter !== "all" && row.verdict !== verdictFilter) return false;
      if (authorFilter !== "all" && row.sender_login !== authorFilter) return false;

      if (quickFilter === "attention" && row.verdict !== "Changes Req" && row.verdict !== "Blocked") return false;
      if (quickFilter === "blocked" && row.verdict !== "Blocked") return false;

      return true;
    });
  }, [displayRows, searchQuery, repoFilter, verdictFilter, authorFilter, quickFilter]);

  return (
    <div className="flex flex-col w-full pb-16 text-[#c9d1d9] antialiased">
      {/* Sub-Header Breadcrumb & Page Header Zone */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 mb-8 border-b border-[#30363d]/60 pt-6">
        <div>
          {/* Breadcrumb navigation link */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#8b949e] mb-1.5">
            <Link className="hover:text-[#f0f6fc] transition-colors" href="/dashboard">
              Dashboard
            </Link>
            <span className="text-[#484f58]">/</span>
            <span className="text-[#58a6ff] font-medium">Pull Requests</span>
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#f0f6fc] flex items-center gap-3 font-display">
            Pull Request Reviews
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
              LIVE AUDIT
            </span>
          </h1>
          <p className="text-[13px] text-[#8b949e] mt-1.5 max-w-2xl leading-relaxed">
            Search, filter, and inspect automated AI code reviews across all connected GitHub repositories. Intercepting compliance invariants before merge.
          </p>
        </div>

        {/* Right Side Header Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-9 px-3.5 rounded-md border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] hover:text-[#f0f6fc] text-[12px] font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <span className={`material-symbols-outlined text-[16px] text-[#8b949e] ${refreshing ? "animate-spin" : ""}`}>
              sync
            </span>
            <span>{refreshing ? "Syncing..." : "Sync PRs from GitHub"}</span>
          </button>
          <a
            href={
              publicConfig?.github_app_slug
                ? `https://github.com/apps/${publicConfig.github_app_slug}/installations/new`
                : "https://github.com/apps"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-4 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-[12px] font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Trigger Manual Review</span>
          </a>
        </div>
      </div>

      {/* Summary Metric Ribbon (4 Cards in a row) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Metric Card 1 */}
        <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b949e] font-semibold">
              Total PRs Inspected (30d)
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#21262d] flex items-center justify-center text-[#58a6ff]">
              <span className="material-symbols-outlined text-[16px]">query_stats</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-semibold text-[#f0f6fc] font-display">
                {telemetry?.total_reviews ?? reviews.length}
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] font-mono mt-1">
              Across {telemetry?.total_repos ?? availableRepos.length} synchronized {telemetry?.total_repos === 1 ? "repository" : "repositories"}
            </p>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b949e] font-semibold">
              Ready to Merge (Pass Rate)
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#21262d] flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-semibold text-emerald-400 font-display">
                {telemetry?.pass_rate_pct != null ? `${telemetry.pass_rate_pct}%` : "0%"}
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] font-mono mt-1">
              {Math.round(((telemetry?.total_reviews ?? reviews.length) * (telemetry?.pass_rate_pct ?? 0)) / 100)} PRs approved
            </p>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b949e] font-semibold">
              Blocker Defects Caught
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
              <span className="material-symbols-outlined text-[16px]">gpp_bad</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-semibold text-red-400 font-display">
                {telemetry?.blocker_defects ?? 0}
              </span>
              <span className="text-[11px] font-mono text-red-400 font-medium">Critical severity</span>
            </div>
            <p className="text-[11px] text-[#8b949e] font-mono mt-1">Security &amp; logic flaws intercepted</p>
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b949e] font-semibold">
              Average Review Latency
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#21262d] flex items-center justify-center text-[#58a6ff]">
              <span className="material-symbols-outlined text-[16px]">bolt</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-semibold text-[#f0f6fc] font-display">
                {telemetry?.avg_latency_seconds ? `${telemetry.avg_latency_seconds}s` : "0.0s"}
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] font-mono mt-1">6 parallel specialized inspection agents</p>
          </div>
        </div>
      </section>

      {/* Advanced Search & Multi-Filter Control Bar */}
      <section className="bg-[#161b22] p-5 rounded-xl border border-[#30363d] flex flex-col gap-4 shadow-sm mb-8">
        {/* Main Search Bar */}
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-[#8b949e]">
            <span className="material-symbols-outlined text-[17px]">search</span>
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-14 text-[12px] font-mono bg-[#0d1117] border border-[#30363d] rounded-md text-[#f0f6fc] placeholder:text-[#8b949e] focus:outline-none focus:border-[#8b949e] transition-all"
            placeholder="Search by PR title, #number, author, branch, or commit SHA..."
            type="text"
          />
          <div className="absolute right-3 top-2 flex items-center gap-1 pointer-events-none">
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-[#21262d] border border-[#30363d] text-[#8b949e] rounded">
              ⌘F
            </kbd>
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Dropdown 1: Repository */}
          <div className="relative">
            <select
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-[12px] bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] appearance-none focus:outline-none cursor-pointer truncate"
            >
              <option value="all">Repository: All ({availableRepos.length})</option>
              {availableRepos.map((repo) => (
                <option key={repo} value={repo}>
                  {repo}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-[15px] text-[#8b949e] absolute right-2.5 top-2.5 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Dropdown 2: Verdict / Status */}
          <div className="relative">
            <select
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-[12px] bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] appearance-none focus:outline-none cursor-pointer"
            >
              <option value="all">Verdict: All Verdicts</option>
              <option value="Merge Ready">Merge Ready</option>
              <option value="Changes Req">Changes Requested</option>
              <option value="Blocked">Blocked</option>
              <option value="In Progress">In Progress</option>
            </select>
            <span className="material-symbols-outlined text-[15px] text-[#8b949e] absolute right-2.5 top-2.5 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Dropdown 3: Author */}
          <div className="relative">
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-[12px] bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] appearance-none focus:outline-none cursor-pointer"
            >
              <option value="all">Author: All ({availableAuthors.length})</option>
              {availableAuthors.map((author) => (
                <option key={author} value={author}>
                  @{author}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-[15px] text-[#8b949e] absolute right-2.5 top-2.5 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Dropdown 4: Date Range */}
          <div className="relative col-span-2 md:col-span-1">
            <select className="w-full h-9 pl-3 pr-8 text-[12px] bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] appearance-none focus:outline-none cursor-pointer">
              <option>Date: All History</option>
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
            <span className="material-symbols-outlined text-[15px] text-[#8b949e] absolute right-2.5 top-2.5 pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        {/* Quick Filter Pills Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#30363d]/60 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[#8b949e] text-[11px] font-mono mr-1">Quick Filters:</span>
            <button
              onClick={() => setQuickFilter(quickFilter === "attention" ? "none" : "attention")}
              className={`px-3 py-1 rounded-full border text-[11px] flex items-center gap-1.5 transition-colors ${
                quickFilter === "attention"
                  ? "bg-[#21262d] border-[#8b949e] text-[#f0f6fc]"
                  : "bg-[#0d1117] border-[#30363d] text-[#c9d1d9] hover:border-[#8b949e]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Needs Attention
              <span className="font-mono text-[10px] text-amber-400 font-semibold">{attentionCount}</span>
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === "blocked" ? "none" : "blocked")}
              className={`px-3 py-1 rounded-full border text-[11px] flex items-center gap-1.5 transition-colors ${
                quickFilter === "blocked"
                  ? "bg-[#21262d] border-red-500 text-[#f0f6fc]"
                  : "bg-[#0d1117] border-[#30363d] text-[#c9d1d9] hover:border-red-500"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              Blocked by Invariants
              <span className="font-mono text-[10px] text-red-400 font-semibold">{blockedCount}</span>
            </button>
          </div>
          {/* Reset Filters */}
          <button
            onClick={() => {
              setSearchQuery("");
              setRepoFilter("all");
              setVerdictFilter("all");
              setAuthorFilter("all");
              setQuickFilter("none");
            }}
            className="text-[#58a6ff] hover:text-[#79c0ff] text-[11px] flex items-center gap-1.5 transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-[15px]">filter_alt_off</span>
            Reset Filters
          </button>
        </div>
      </section>

      {/* Comprehensive PR Reviews Data Table */}
      <section className="bg-[#161b22] rounded-xl border border-[#30363d] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0d1117] border-b border-[#30363d] text-[10px] font-mono uppercase tracking-wider text-[#8b949e] font-semibold">
                <th className="py-3 px-5">Verdict</th>
                <th className="py-3 px-5 min-w-[280px]">Pull Request</th>
                <th className="py-3 px-5">Repository</th>
                <th className="py-3 px-5">Branch</th>
                <th className="py-3 px-5">Author</th>
                <th className="py-3 px-5">Merge Score</th>
                <th className="py-3 px-5">Findings</th>
                <th className="py-3 px-5">Cost &amp; Tokens</th>
                <th className="py-3 px-5">Completed</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]/60 text-[12px]">
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#21262d]/40 transition-colors group">
                    <td className="py-4 px-5 whitespace-nowrap">
                      {row.verdict === "Merge Ready" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium text-[11px]">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          Merge Ready
                        </span>
                      ) : row.verdict === "In Progress" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium text-[11px]">
                          <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                          In Progress
                        </span>
                      ) : row.verdict === "Blocked" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 font-medium text-[11px]">
                          <span className="material-symbols-outlined text-[13px]">block</span>
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium text-[11px]">
                          <span className="material-symbols-outlined text-[13px]">warning</span>
                          Changes Req
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex flex-col">
                        <Link
                          className="font-medium text-[#f0f6fc] hover:text-[#58a6ff] transition-colors flex items-center gap-1.5 group-hover:underline"
                          href={`/dashboard/reviews/${row.id}`}
                        >
                          <span className="font-mono text-[#58a6ff]">#{row.pr_number}</span>
                          <span>{row.pr_title}</span>
                        </Link>
                        <span className="text-[11px] font-mono text-[#8b949e] flex items-center gap-2 mt-0.5">
                          <span>SHA: {row.commit_sha}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap font-mono text-[#8b949e]">
                      <span className="px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d]">
                        {row.repo_full_name}
                      </span>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap font-mono text-[11px] text-[#c9d1d9]">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[#8b949e]">{row.branch_head}</span>
                        <span className="material-symbols-outlined text-[12px] text-[#484f58]">arrow_forward</span>
                        <span className="font-medium text-[#f0f6fc]">{row.branch_base}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <div className="w-5.5 h-5.5 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[10px] font-bold text-[#c9d1d9]">
                          {row.sender_login.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[#c9d1d9]">@{row.sender_login}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-[#0d1117] text-[#f0f6fc] border border-[#30363d]">
                        {row.merge_score}
                      </span>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      {row.verdict === "In Progress" ? (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[14px] text-[#58a6ff] animate-spin">
                            progress_activity
                          </span>
                          <span className="font-mono text-[11px] text-[#58a6ff] font-medium">
                            Inspecting ({row.progress?.completed_agents ?? 0}/{row.progress?.total_agents ?? 6} agents done)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          {row.findings.crit ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold border border-red-500/30">
                              {row.findings.crit} crit
                            </span>
                          ) : null}
                          {row.findings.warn ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                              {row.findings.warn} warn
                            </span>
                          ) : null}
                          {row.findings.info ? (
                            <span className="px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                              {row.findings.info} info
                            </span>
                          ) : null}
                          {!row.findings.crit && !row.findings.warn && !row.findings.info ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              0 findings
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap font-mono text-[#8b949e] text-[11px]">
                      {row.cost_and_tokens}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap font-mono text-[#8b949e] text-[11px]">
                      {row.completed_ago}
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/dashboard/reviews/${row.id}`}
                          className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#f0f6fc] font-medium text-[11px] transition-colors flex items-center gap-1.5 border border-[#30363d]"
                        >
                          <span>View Analysis</span>
                          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                        </Link>
                        <a
                          href={`https://github.com/${row.repo_full_name}/pull/${row.pr_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
                          title="Open in GitHub"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center">
                      <div className="w-12 h-12 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#8b949e] mb-3">
                        <span className="material-symbols-outlined text-[24px]">inbox</span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#f0f6fc]">No pull request reviews found</h3>
                      <p className="text-xs text-[#8b949e] mt-1 font-mono">
                        {searchQuery || repoFilter !== "all" || verdictFilter !== "all" || authorFilter !== "all"
                          ? "No reviews match your current filters. Try resetting search filters."
                          : "Install the GitHub App or submit a PR to start automated multi-agent security and architectural reviews."}
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
      </section>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[#8b949e] font-mono text-xs">Loading review feed...</div>}>
      <ReviewsPageContent />
    </Suspense>
  );
}
