"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { api, type Installation, type RepoSettings } from "@/lib/api";
import {
  BookMarked,
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  GitPullRequest,
  SlidersHorizontal,
  Shield,
  ShieldCheck,
  Zap,
  BookOpen,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { RepoSettingsModal } from "@/components/RepoSettingsModal";

export default function RepositoriesPage() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [profileFilter, setProfileFilter] = useState<string>("all");

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
    return installations.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!r.repo_full_name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [installations, search]);

  return (
    <div className="flex flex-col w-full text-slate-100 pb-12">
      {/* 1. Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-6 border-b border-[#30363d]/70">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e] tracking-tight">
            <span>Governance</span>
            <span className="text-[#484f58]">/</span>
            <span className="text-[#c9d1d9] font-medium">Repository Management</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#161b22] border border-[#30363d] text-[#58a6ff] font-mono ml-1.5">
              {installations.length} CONNECTED
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-[#f0f6fc] flex items-center gap-3">
            Repository Governance &amp; Policy Hub
          </h1>
          <p className="text-xs md:text-sm text-[#8b949e] max-w-2xl font-normal leading-relaxed">
            Centralized policy configuration, custom rulebooks, and agent strictness parameters across connected organization repositories.
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
            {refreshing ? "Syncing..." : "Sync Installations"}
          </Button>

          <Button asChild size="sm" className="h-8 text-xs bg-[#f0f6fc] hover:bg-white text-[#0d1117] font-semibold">
            <a
              href={
                process.env.NEXT_PUBLIC_GITHUB_APP_URL ||
                "https://github.com/apps/review-x/installations/new"
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <Plus className="size-3.5 mr-1" />
              Add Repository
            </a>
          </Button>
        </div>
      </header>

      {/* 2. Repositories Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-[#30363d]/60">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8b949e]" />
            <Input
              placeholder="Filter repositories by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs border-[#30363d] bg-[#0d1117] text-[#e6edf3] placeholder-[#8b949e]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#8b949e] font-mono">
          <span>Showing {filtered.length} of {installations.length} repositories</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4 bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]">
          <AlertCircle className="size-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* 3. High-Density Repository Rows */}
      {loading ? (
        <div className="flex flex-col divide-y divide-[#30363d]/60 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-5 flex flex-col gap-2">
              <Skeleton className="h-5 w-48 bg-[#21262d]" />
              <Skeleton className="h-3 w-80 bg-[#21262d]" />
            </div>
          ))}
        </div>
      ) : installations.length === 0 ? (
        <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-16 text-center flex flex-col items-center justify-center gap-2 my-6">
          <BookMarked className="size-8 text-[#8b949e]" />
          <div className="text-sm font-semibold text-white">No repositories connected</div>
          <p className="max-w-md text-xs text-[#8b949e]">
            Install the CodeSentinel GitHub App on your account or organization to enable multi-agent review on PRs.
          </p>
          <Button asChild size="sm" className="mt-3 text-xs bg-[#f0f6fc] hover:bg-white text-[#0d1117] font-semibold">
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
        <div className="divide-y divide-[#30363d]/60 bg-[#161b22] border border-[#30363d] rounded-lg mt-4 overflow-hidden px-4 sm:px-6 shadow-xs">
          {filtered.map((repo) => (
            <RepoRow key={`${repo.installation_id}-${repo.repo_full_name}`} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}

function RepoRow({ repo }: { repo: Installation }) {
  const githubUrl = `https://github.com/${repo.repo_full_name}`;
  const [settings, setSettings] = useState<RepoSettings | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getRepoSettings(repo.installation_id, repo.repo_full_name)
      .then((res) => {
        if (mounted) setSettings(res.settings);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [repo.installation_id, repo.repo_full_name]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await api.syncInstallation(repo.installation_id);
      setSyncMsg(
        res.status === "sync_already_queued"
          ? "Sync in progress"
          : "PR sync queued"
      );
    } catch (err: unknown) {
      setSyncMsg(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const renderProfileBadge = () => {
    const prof = settings?.profile || "standard";
    if (prof === "lenient") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
          <Zap className="size-3 text-amber-400" /> Rapid Dev
        </span>
      );
    }
    if (prof === "strict") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
          <ShieldCheck className="size-3" /> High Assurance
        </span>
      );
    }
    if (prof === "custom") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#30363d] bg-[#21262d] px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
          <SlidersHorizontal className="size-3" /> Custom Policy
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#30363d] bg-[#21262d] px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
        <Shield className="size-3 text-[#8b949e]" /> Standard
      </span>
    );
  };

  return (
    <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <span className="rounded-full border border-[#30363d] bg-[#21262d] px-2 py-0 text-[10px] font-mono text-[#8b949e]">
            Public
          </span>
          <div className="ml-2">{renderProfileBadge()}</div>
        </div>

        <p className="text-xs text-[#8b949e] leading-relaxed">
          Automated CodeSentinel GitHub webhook integration with LangGraph ReAct agent pipeline.
        </p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#8b949e] pt-1 font-mono">
          {/* Active Modules */}
          <span>
            {settings ? `${settings.enabled_agents?.length ?? 6} of 6 modules` : "6 of 6 modules"}
          </span>

          {/* Rulebook count */}
          {settings?.rulebook?.trim() ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5DB579]">
              <BookOpen className="size-3" />
              Rulebook ({settings.rulebook.trim().split("\n").length} lines)
            </span>
          ) : (
            <span className="text-[11px] text-[#8b949e]">Default invariants</span>
          )}

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
          {syncMsg && <span className="text-[11px] text-primary">{syncMsg}</span>}
        </div>
      </div>

      {/* Right Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="h-7 text-xs border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d]"
          title="Configure strictness profile, enabled agents, and custom rulebook"
        >
          <SlidersHorizontal className="size-3 mr-1 text-[#5DB579]" />
          Policy &amp; Rules
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="h-7 text-xs border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d]"
          title="Sync existing open PRs for this installation"
        >
          <RefreshCw className={`size-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync"}
        </Button>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-7 text-xs border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d]"
        >
          <Link href={`/dashboard/reviews?repo=${encodeURIComponent(repo.repo_full_name)}`}>
            <GitPullRequest className="size-3 mr-1" />
            Pull Requests
          </Link>
        </Button>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-[#8b949e] hover:text-white"
        >
          <a href={githubUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>

      {modalOpen && (
        <RepoSettingsModal
          installationId={repo.installation_id}
          repoFullName={repo.repo_full_name}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={(newSettings) => setSettings(newSettings)}
        />
      )}
    </div>
  );
}
