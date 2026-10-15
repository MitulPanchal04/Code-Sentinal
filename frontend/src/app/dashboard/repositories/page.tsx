"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import type { Installation, RepoSettings } from "@/lib/api";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  Search,
  ExternalLink,
  GitBranch,
  Clock,
  Shield,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  BookOpen,
} from "lucide-react";
import { RepoSettingsModal } from "@/components/RepoSettingsModal";

export default function RepositoriesPage() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.listInstallations();

       
      setInstallations(data.installations || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load repositories: ${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = useMemo(() => {
    let result = installations;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.repo_full_name.toLowerCase().includes(q));
    }

    return result;
  }, [installations, search]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
  }, []);

  const hasFilters = search || statusFilter !== "all";

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
        <div>
          <h2 className="text-xl font-semibold">Repositories</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All repositories with CodeSentinel installed.
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <p className="text-sm text-yellow-500">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-6 rounded-lg border border-border bg-card px-6 py-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums">
            {installations.length}
          </span>
          <span className="text-sm text-muted-foreground">connected</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search repos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-52 rounded-md border border-border bg-card py-1.5 pl-8 pr-3 text-sm placeholder-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {installations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-24 text-center">
          <GitBranch className="mb-4 h-8 w-8 text-muted-foreground" />
          <div className="text-sm font-medium">No repositories connected</div>
          <div className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            CodeSentinel doesn&apos;t have access to any repositories yet.
            Configure the GitHub App installation to select repos.
          </div>
          <a
            href={
              process.env.NEXT_PUBLIC_GITHUB_APP_URL ||
              "https://github.com/apps/review-x/installations/new"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            Configure on GitHub <ExternalLink size={12} />
          </a>
        </div>
      ) : filtered.length === 0 && hasFilters ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-24 text-center">
          <Search className="mb-4 h-7 w-7 text-muted-foreground" />
          <div className="text-sm font-medium">No repos match your filters</div>
          <button
            onClick={clearFilters}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((repo) => (
            <RepoCard key={`${repo.installation_id}-${repo.repo_full_name}`} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}

function RepoCard({ repo }: { repo: Installation }) {
  const githubUrl = `https://github.com/${repo.repo_full_name}`;
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [settings, setSettings] = useState<RepoSettings | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
          ? "Sync already in progress"
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
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
          <Zap size={11} className="text-amber-500" /> Rapid Dev
        </span>
      );
    }
    if (prof === "strict") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
          <ShieldCheck size={11} /> High Assurance
        </span>
      );
    }
    if (prof === "custom") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
          <SlidersHorizontal size={11} /> Custom Policy
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
        <Shield size={11} className="text-muted-foreground" /> Standard
      </span>
    );
  };

  return (
    <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 shadow-sm">
      <div>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
            >
              <span className="truncate">{repo.repo_full_name}</span>
              <ExternalLink
                size={11}
                className="text-muted-foreground transition-colors group-hover:text-primary shrink-0"
              />
            </a>
            <div className="mt-1 flex items-center gap-2">
              {repo.model_id && (
                <span className="text-xs text-muted-foreground">{repo.model_id}</span>
              )}
              <span className="text-xs text-muted-foreground">
                Installation #{repo.installation_id}
              </span>
            </div>
          </div>
          <div className="shrink-0">{renderProfileBadge()}</div>
        </div>

        <div className="mb-3 border-t border-border/50" />

        {/* Squad & Rulebook Details */}
        <div className="space-y-1.5 py-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock size={12} className="text-muted-foreground" />
              Active Modules:
            </span>
            <span className="font-medium text-foreground">
              {settings ? `${settings.enabled_agents?.length ?? 6} of 6 modules` : "6 of 6 modules"}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <BookOpen size={12} className="text-muted-foreground" />
              Rulebook:
            </span>
            {settings?.rulebook?.trim() ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                Configured ({settings.rulebook.trim().split("\n").length} lines)
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">Default invariants</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-xs text-green-500 font-medium">Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-accent/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:border-border/80"
              title="Configure strictness profile, enabled agents, and custom rulebook"
            >
              <SlidersHorizontal size={12} className="text-primary" />
              Policy & Rules
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
              title="Sync existing open PRs for this installation"
            >
              <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync"}
            </button>
          </div>
        </div>
        {syncMsg && (
          <p className="mt-2 text-xs text-muted-foreground">{syncMsg}</p>
        )}
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
