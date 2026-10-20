"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, Review } from "@/lib/api";

interface DemoReviewItem {
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
  cost_and_tokens: string;
  completed_ago: string;
}

const DEMO_REVIEWS: DemoReviewItem[] = [
  {
    id: 1,
    pr_number: 142,
    pr_title: "feat(billing): integrate multi-tenant Stripe webhooks",
    repo_full_name: "acme-corp/payment-service",
    branch_head: "feature/stripe-webhooks",
    branch_base: "main",
    sender_login: "octocat",
    commit_sha: "4a9f82d",
    verdict: "Merge Ready",
    merge_score: "8.5 / 10",
    findings: { crit: 1, warn: 2 },
    cost_and_tokens: "$0.041 • 14.8k",
    completed_ago: "8m ago",
  },
  {
    id: 2,
    pr_number: 89,
    pr_title: "fix(auth): session expiration edge case",
    repo_full_name: "acme-corp/auth-gateway",
    branch_head: "fix/session-timeout",
    branch_base: "main",
    sender_login: "dev-lead",
    commit_sha: "9b23ec1",
    verdict: "In Progress",
    merge_score: "Evaluating...",
    findings: {},
    cost_and_tokens: "Running...",
    completed_ago: "1m ago",
  },
  {
    id: 3,
    pr_number: 67,
    pr_title: "feat(sql): add raw customer query execution without tenant isolation",
    repo_full_name: "acme-corp/core-api",
    branch_head: "feat/raw-queries",
    branch_base: "main",
    sender_login: "junior-eng",
    commit_sha: "1f48ad9",
    verdict: "Blocked",
    merge_score: "3.2 / 10",
    findings: { crit: 2, warn: 3 },
    cost_and_tokens: "$0.038 • 12.1k",
    completed_ago: "24m ago",
  },
  {
    id: 4,
    pr_number: 54,
    pr_title: "docs(api): update OpenAPI specs for v2 endpoints",
    repo_full_name: "acme-corp/docs",
    branch_head: "docs/openapi-v2",
    branch_base: "main",
    sender_login: "tech-writer",
    commit_sha: "6c7d8e2",
    verdict: "Merge Ready",
    merge_score: "9.8 / 10",
    findings: { info: 1 },
    cost_and_tokens: "$0.012 • 4.2k",
    completed_ago: "1h ago",
  },
  {
    id: 5,
    pr_number: 112,
    pr_title: "refactor(cache): implement redis cluster connection pooling",
    repo_full_name: "acme-corp/common-lib",
    branch_head: "refactor/redis-pool",
    branch_base: "main",
    sender_login: "senior-dev",
    commit_sha: "8a3b5c7",
    verdict: "Changes Req",
    merge_score: "6.4 / 10",
    findings: { crit: 1, warn: 1 },
    cost_and_tokens: "$0.045 • 16.2k",
    completed_ago: "3h ago",
  },
];

export default function ReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [repoFilter, setRepoFilter] = useState(searchParams.get("repo") || "all");
  const [verdictFilter, setVerdictFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<"none" | "attention" | "blocked" | "mine">("none");

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.listReviews({
        repo: repoFilter !== "all" ? repoFilter : undefined,
        limit: 100,
      });
      setReviews(data.reviews || []);
    } catch (err: unknown) {
      console.warn("Could not fetch reviews from backend, rendering sample review audit list:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repoFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayRows: DemoReviewItem[] = useMemo(() => {
    if (reviews.length === 0) return DEMO_REVIEWS;

    return reviews.map((r) => {
      const isBlocked = r.status === "failed" || (r.merge_score !== null && r.merge_score < 3);
      const isMergeReady = (r.merge_score !== null && r.merge_score >= 4) && r.status === "complete";
      const isInProg = r.status !== "complete" && r.status !== "failed";

      const verdict: DemoReviewItem["verdict"] = isBlocked
        ? "Blocked"
        : isMergeReady
        ? "Merge Ready"
        : isInProg
        ? "In Progress"
        : "Changes Req";

      const critCount = r.findings?.filter((f) => f.severity === "critical").length || 0;
      const warnCount = r.findings?.filter((f) => f.severity === "warning").length || 0;

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
        merge_score: r.merge_score ? `${(r.merge_score * 2).toFixed(1)} / 10` : "8.0 / 10",
        findings: { crit: critCount || undefined, warn: warnCount || undefined },
        cost_and_tokens: "$0.041 • 14.8k",
        completed_ago: "Recently",
      };
    });
  }, [reviews]);

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

      if (quickFilter === "attention" && row.verdict !== "Changes Req" && row.verdict !== "Blocked") return false;
      if (quickFilter === "blocked" && row.verdict !== "Blocked") return false;
      if (quickFilter === "mine" && row.sender_login !== "octocat") return false;

      return true;
    });
  }, [displayRows, searchQuery, repoFilter, verdictFilter, quickFilter]);

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
            href="https://github.com/apps"
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
              <span className="text-[26px] font-semibold text-[#f0f6fc] font-display">428</span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center">
                <span className="material-symbols-outlined text-[13px]">trending_up</span> +12%
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] font-mono mt-1">Across 14 synchronized repositories</p>
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
              <span className="text-[26px] font-semibold text-emerald-400 font-display">89.4%</span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center">
                <span className="material-symbols-outlined text-[13px]">trending_up</span> +2.1%
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] font-mono mt-1">383 PRs approved first-pass</p>
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
              <span className="text-[26px] font-semibold text-red-400 font-display">39</span>
              <span className="text-[11px] font-mono text-red-400 font-medium">High severity</span>
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
              <span className="text-[26px] font-semibold text-[#f0f6fc] font-display">4.6s</span>
              <span className="text-[11px] font-mono text-[#8b949e] font-medium">P95: 7.2s</span>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Dropdown 1: Repository */}
          <div className="relative">
            <select
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-[12px] bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] appearance-none focus:outline-none cursor-pointer truncate"
            >
              <option value="all">Repository: All Repositories</option>
              <option value="acme-corp/payment-service">acme-corp/payment-service</option>
              <option value="acme-corp/auth-gateway">acme-corp/auth-gateway</option>
              <option value="acme-corp/core-api">acme-corp/core-api</option>
              <option value="acme-corp/docs">acme-corp/docs</option>
              <option value="acme-corp/common-lib">acme-corp/common-lib</option>
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

          {/* Dropdown 3: Module */}
          <div className="relative">
            <select className="w-full h-9 pl-3 pr-8 text-[12px] bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] appearance-none focus:outline-none cursor-pointer">
              <option>Module: All Squads</option>
              <option>Security Sentinel</option>
              <option>Logic &amp; Concurrency</option>
              <option>Defensive Error</option>
              <option>Test Coverage</option>
            </select>
            <span className="material-symbols-outlined text-[15px] text-[#8b949e] absolute right-2.5 top-2.5 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Dropdown 4: Author */}
          <div className="relative">
            <select className="w-full h-9 pl-3 pr-8 text-[12px] bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] appearance-none focus:outline-none cursor-pointer">
              <option>Author: All Contributors</option>
              <option>@octocat</option>
              <option>@dev-lead</option>
              <option>@junior-eng</option>
              <option>@senior-dev</option>
            </select>
            <span className="material-symbols-outlined text-[15px] text-[#8b949e] absolute right-2.5 top-2.5 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Dropdown 5: Date Range */}
          <div className="relative col-span-2 md:col-span-1">
            <select className="w-full h-9 pl-3 pr-8 text-[12px] bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] appearance-none focus:outline-none cursor-pointer">
              <option>Date: Last 30 Days</option>
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 90 Days</option>
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
              <span className="font-mono text-[10px] text-amber-400 font-semibold">14</span>
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
              <span className="font-mono text-[10px] text-red-400 font-semibold">3</span>
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === "mine" ? "none" : "mine")}
              className={`px-3 py-1 rounded-full border text-[11px] flex items-center gap-1.5 transition-colors ${
                quickFilter === "mine"
                  ? "bg-[#21262d] border-emerald-500 text-[#f0f6fc]"
                  : "bg-[#0d1117] border-[#30363d] text-[#c9d1d9] hover:border-emerald-500"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Mine (@octocat)
            </button>
          </div>
          {/* Reset Filters */}
          <button
            onClick={() => {
              setSearchQuery("");
              setRepoFilter("all");
              setVerdictFilter("all");
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
              {filteredRows.map((row) => (
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
                        <span>•</span>
                        <span>+412 / -88 lines</span>
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
                    </div>
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
