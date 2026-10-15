"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { api, Installation } from "@/lib/api";
import {
  BookMarked,
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  GitPullRequest,
  Star,
  CheckCircle2,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function RepositoriesPage() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.listInstallations();
      setInstallations(data.installations || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch connected repositories: ${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return installations;
    const q = search.toLowerCase();
    return installations.filter((r) =>
      r.repo_full_name.toLowerCase().includes(q)
    );
  }, [installations, search]);

  return (
    <div className="flex flex-col gap-5">
      {/* GitHub Repositories Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Find a repository..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-9 text-xs border-[#30363d] bg-[#0d1117] text-[#e6edf3]"
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
            {refreshing ? "Syncing..." : "Sync Repos"}
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
              <BookMarked data-icon="inline-start" />
              New Repository
            </a>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]">
          <AlertCircle className="size-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* GitHub Repository Rows */}
      {loading ? (
        <div className="flex flex-col divide-y divide-[#30363d]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="py-5 flex flex-col gap-2">
              <Skeleton className="h-5 w-48 bg-[#21262d]" />
              <Skeleton className="h-3 w-80 bg-[#21262d]" />
            </div>
          ))}
        </div>
      ) : installations.length === 0 ? (
        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-16 text-center flex flex-col items-center justify-center gap-2">
          <BookMarked className="size-8 text-muted-foreground" />
          <div className="text-sm font-semibold text-white">No repositories connected</div>
          <p className="max-w-md text-xs text-muted-foreground">
            Install the CodeSentinel GitHub App on your account or organization to enable multi-agent review on PRs.
          </p>
          <Button asChild size="sm" className="mt-3 text-xs bg-[#238636] hover:bg-[#2ea043] text-white">
            <a
              href={
                process.env.NEXT_PUBLIC_GITHUB_APP_URL ||
                "https://github.com/apps/review-x/installations/new"
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              Install GitHub App
            </a>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-[#30363d]">
          {filtered.map((repo) => {
            const githubUrl = `https://github.com/${repo.repo_full_name}`;
            return (
              <div
                key={`${repo.installation_id}-${repo.repo_full_name}`}
                className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-base text-[#58a6ff] hover:underline"
                    >
                      {repo.repo_full_name}
                    </a>
                    <span className="rounded-full border border-[#30363d] bg-[#21262d] px-2 py-0 text-[10px] font-mono text-muted-foreground">
                      Public
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Automated CodeSentinel GitHub webhook integration with LangGraph ReAct agent pipeline.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                    {/* Language indicator */}
                    <span className="flex items-center gap-1.5">
                      <span className="size-3 rounded-full bg-[#3572A5]" />
                      <span>Python / TS</span>
                    </span>

                    {/* Model Tag */}
                    <span className="rounded bg-[#21262d] px-1.5 py-0.5 text-[11px] font-mono text-[#e6edf3] border border-[#30363d]">
                      {repo.model_id || "default model"}
                    </span>

                    {/* Active Status */}
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>

                    <span>Installation #{repo.installation_id}</span>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d]"
                  >
                    <Link href={`/dashboard/reviews?repo=${encodeURIComponent(repo.repo_full_name)}`}>
                      <GitPullRequest data-icon="inline-start" />
                      Pull Requests
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-white"
                  >
                    <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
