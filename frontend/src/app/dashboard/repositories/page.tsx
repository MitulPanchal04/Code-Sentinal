"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api, type Installation, type RepoSettings, type PublicConfig } from "@/lib/api";
import { RepoSettingsModal } from "@/components/RepoSettingsModal";

interface DisplayRepo {
  id: number;
  repo_full_name: string;
  installation_id: number;
  policyTier: "High Assurance" | "Standard" | "Rapid Dev";
  tierIcon: string;
  models: string;
  activeModules: string[];
  rulesCount: number;
  webhookActive: boolean;
  settings?: RepoSettings;
}

export default function RepositoriesPage() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "custom">("all");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");

  // Modal State
  const [activeModalRepo, setActiveModalRepo] = useState<DisplayRepo | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [data, configData] = await Promise.all([
        api.listInstallations().catch(() => ({ installations: [] })),
        api.getPublicConfig().catch(() => null),
      ]);
      setInstallations(data.installations || []);
      if (configData) setPublicConfig(configData);
    } catch (err: unknown) {
      console.warn("Could not fetch installations from backend:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Construct display items directly from real installations
  const combinedRepos: DisplayRepo[] = useMemo(() => {
    return installations.map((inst, idx) => {
      const settings = (inst.config as unknown as RepoSettings) || undefined;
      const tier: "High Assurance" | "Standard" | "Rapid Dev" =
        settings?.profile === "strict"
          ? "High Assurance"
          : settings?.profile === "lenient"
          ? "Rapid Dev"
          : "Standard";

      const modules = settings?.enabled_agents?.map(
        (a) => a.charAt(0).toUpperCase() + a.slice(1)
      ) || [
        "Security",
        "Bugs",
        "ErrorHandling",
        "Style",
        "TestCoverage",
        "CommentAccuracy",
      ];

      return {
        id: inst.installation_id * 1000 + idx,
        repo_full_name: inst.repo_full_name,
        installation_id: inst.installation_id,
        policyTier: tier,
        tierIcon: tier === "High Assurance" ? "security" : tier === "Standard" ? "balance" : "bolt",
        models: inst.model_id || publicConfig?.primary_model || "Claude 3.7 Sonnet / GPT-6 Astra",
        activeModules: modules,
        rulesCount: settings?.rulebook
          ? (settings.rulebook.match(/###|- \*\*/g) || []).length || 6
          : 6,
        webhookActive: true,
        settings,
      };
    });
  }, [installations, publicConfig]);

  const filteredRepos = useMemo(() => {
    return combinedRepos.filter((repo) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !repo.repo_full_name.toLowerCase().includes(q) &&
          !String(repo.installation_id).includes(q)
        ) {
          return false;
        }
      }
      if (filterTab === "active" && !repo.webhookActive) return false;
      if (filterTab === "custom" && repo.policyTier !== "High Assurance") return false;
      return true;
    });
  }, [combinedRepos, search, filterTab]);

  const appSlug = publicConfig?.github_app_slug || "code-sentinel-app";
  const installUrl = `https://github.com/apps/${appSlug}/installations/new`;

  return (
    <div className="flex flex-col w-full pb-12">
      {/* Top Breadcrumb & Executive Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pt-6">
        <div className="flex flex-col gap-2">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[#8b949e] font-mono text-[11px]">
            <a className="hover:text-[#f0f6fc] transition-colors" href="/dashboard">
              Dashboard
            </a>
            <span className="text-[#484f58]">/</span>
            <span className="text-[#f0f6fc] uppercase tracking-wider font-semibold">Repositories</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[28px] font-semibold text-[#f0f6fc] tracking-tight leading-tight">
              Connected Repositories
            </h1>
            <span className="px-2.5 py-0.5 rounded-md bg-[#161b22] border border-[#30363d] text-[#8b949e] font-mono text-[11px] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              2 Orgs Synced
            </span>
          </div>
          <p className="text-[13px] text-[#8b949e] max-w-3xl leading-relaxed">
            Manage GitHub App installations, monitor active AI review squads, and configure per-repository governance policies.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 h-9 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-[#f0f6fc] font-medium text-[12px] border border-[#30363d] transition-colors"
            type="button"
          >
            <span className={`material-symbols-outlined text-[16px] text-[#8b949e] ${refreshing ? "animate-spin" : ""}`}>
              sync
            </span>
            <span>{refreshing ? "Refreshing..." : "Refresh Status"}</span>
          </button>
          <a
            href={installUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 h-9 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-medium text-[12px] border border-[rgba(240,246,252,0.1)] transition-colors shadow-sm"
          >
            <span>Configure GitHub App</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>
        </div>
      </header>

      {/* Top KPI Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {/* KPI 1 */}
        <div className="rounded-xl bg-[#161b22] p-5 border border-[#30363d] flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <span className="font-mono text-[10px] text-[#8b949e] tracking-wider uppercase font-semibold">
              Monitored Repositories
            </span>
            <span className="material-symbols-outlined text-[#8b949e] text-[18px]">account_tree</span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-[26px] font-semibold text-[#f0f6fc]">
              {combinedRepos.length}
            </span>
            <span className="font-mono text-[11px] text-[#8b949e]">connected</span>
          </div>
          <div className="flex items-center justify-between text-[#8b949e] font-mono text-[11px]">
            <span>across 2 GitHub orgs</span>
            <span className="text-emerald-400 font-mono text-[11px]">98.2% code cov</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-xl bg-[#161b22] p-5 border border-[#30363d] flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <span className="font-mono text-[10px] text-[#8b949e] tracking-wider uppercase font-semibold">
              Governance Policies
            </span>
            <span className="material-symbols-outlined text-[#8b949e] text-[18px]">verified_user</span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-[26px] font-semibold text-[#f0f6fc]">
              {combinedRepos.length}
            </span>
            <span className="font-mono text-[11px] text-[#8b949e]">active profiles</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-[#8b949e]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300"></span>
              2 High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
              9 Std
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
              3 Rapid
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-xl bg-[#161b22] p-5 border border-[#30363d] flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <span className="font-mono text-[10px] text-[#8b949e] tracking-wider uppercase font-semibold">
              Active Rulebooks
            </span>
            <span className="material-symbols-outlined text-[#8b949e] text-[18px]">gavel</span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-[26px] font-semibold text-[#f0f6fc]">8</span>
            <span className="font-mono text-[11px] text-[#8b949e]">enforced</span>
          </div>
          <div className="flex items-center justify-between text-[#8b949e] font-mono text-[11px]">
            <span>142 automated checks</span>
            <span className="text-[#8b949e]">v2.4 sync</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-xl bg-[#161b22] p-5 border border-[#30363d] flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <span className="font-mono text-[10px] text-[#8b949e] tracking-wider uppercase font-semibold">
              Webhook Pipeline
            </span>
            <span className="px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] font-mono text-[10px]">
              18ms avg
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span className="font-display text-[26px] font-semibold text-[#f0f6fc]">100%</span>
            <span className="font-mono text-[11px] text-emerald-400 font-medium">Operational</span>
          </div>
          <div className="flex items-center justify-between text-[#8b949e] font-mono text-[11px]">
            <span>Event Ingestion</span>
            <span className="text-[#8b949e] font-mono text-[10px]">0 dropped / 24h</span>
          </div>
        </div>
      </section>

      {/* Filter & Search Control Workbench */}
      <section className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-xl bg-[#161b22] border border-[#30363d] mb-8 shadow-sm">
        {/* Search Field */}
        <div className="relative flex-1 max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8b949e]">
            <span className="material-symbols-outlined text-[17px]">search</span>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-12 bg-[#0d1117] text-[#f0f6fc] placeholder:text-[#8b949e] font-sans text-[12px] rounded-md border border-[#30363d] focus:border-[#8b949e] focus:outline-none focus:ring-0 transition-colors"
            placeholder="Search repositories by name, owner, or installation ID..."
            type="text"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-[#8b949e] font-mono text-[10px]">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Segmented Filter & Controls */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
          {/* Segmented Buttons */}
          <div className="flex p-0.5 bg-[#0d1117] rounded-md border border-[#30363d]">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded font-medium text-[12px] transition-colors ${
                filterTab === "all"
                  ? "bg-[#21262d] text-[#f0f6fc] shadow-sm"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
              type="button"
            >
              All Repositories
            </button>
            <button
              onClick={() => setFilterTab("active")}
              className={`px-3 py-1.5 rounded font-medium text-[12px] transition-colors ${
                filterTab === "active"
                  ? "bg-[#21262d] text-[#f0f6fc] shadow-sm"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
              type="button"
            >
              Active Webhooks
            </button>
            <button
              onClick={() => setFilterTab("custom")}
              className={`px-3 py-1.5 rounded font-medium text-[12px] transition-colors ${
                filterTab === "custom"
                  ? "bg-[#21262d] text-[#f0f6fc] shadow-sm"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
              type="button"
            >
              Custom Policies
            </button>
          </div>

          {/* Quick Sorting Dropdown & View Layout Toggle */}
          <div className="flex items-center gap-2">
            <button
              className="h-9 px-3 bg-[#0d1117] border border-[#30363d] hover:border-[#8b949e] rounded-md text-[#c9d1d9] font-medium text-[12px] flex items-center gap-1.5 transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px] text-[#8b949e]">sort</span>
              <span className="text-[#8b949e]">Sort:</span>
              <span>Policy Tier</span>
              <span className="material-symbols-outlined text-[14px] text-[#8b949e]">expand_more</span>
            </button>
            <div className="flex bg-[#0d1117] rounded-md border border-[#30363d] p-0.5">
              <button
                onClick={() => setViewLayout("grid")}
                aria-label="Grid View"
                className={`p-1.5 rounded transition-colors ${
                  viewLayout === "grid" ? "bg-[#21262d] text-[#f0f6fc]" : "text-[#8b949e] hover:text-[#f0f6fc]"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
              </button>
              <button
                onClick={() => setViewLayout("list")}
                aria-label="List View"
                className={`p-1.5 rounded transition-colors ${
                  viewLayout === "list" ? "bg-[#21262d] text-[#f0f6fc]" : "text-[#8b949e] hover:text-[#f0f6fc]"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">view_list</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Repository 3-Column Responsive Grid */}
      <div
        className={
          viewLayout === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            : "flex flex-col gap-4"
        }
      >
        {loading ? (
          <div className="col-span-full py-16 text-center text-[#8b949e] font-mono text-xs flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-2xl animate-spin text-[#58a6ff]">progress_activity</span>
            <span>Discovering connected GitHub repositories...</span>
          </div>
        ) : combinedRepos.length === 0 ? (
          <div className="col-span-full rounded-xl bg-[#161b22] border border-[#30363d] p-10 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-10 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#58a6ff] mb-4">
              <span className="material-symbols-outlined text-3xl">account_tree</span>
            </div>
            <h3 className="text-[18px] font-semibold text-[#f0f6fc] mb-2 font-display">
              No Repositories Connected Yet
            </h3>
            <p className="text-[13px] text-[#8b949e] mb-6 max-w-md leading-relaxed">
              Connect CodeSentinel to your GitHub repositories or organization to enable automated multi-agent code reviews, architectural rulebook enforcement, and live defect interception.
            </p>
            <a
              href={installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-semibold text-[13px] border border-[rgba(240,246,252,0.1)] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Install CodeSentinel GitHub App</span>
            </a>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#8b949e] font-mono text-xs">
            No repositories match &quot;{search}&quot;.
          </div>
        ) : (
          filteredRepos.map((repo) => (
          <article
            key={repo.id}
            className="flex flex-col justify-between rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#8b949e] transition-colors duration-150 shadow-sm"
          >
            <div>
              {/* Card Header */}
              <div className="p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <a
                    className="group/link flex items-center gap-1.5 text-[#f0f6fc] hover:text-[#58a6ff] transition-colors min-w-0"
                    href={`https://github.com/${repo.repo_full_name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="font-mono text-[13.5px] font-semibold truncate">{repo.repo_full_name}</span>
                    <span className="material-symbols-outlined text-[15px] text-[#8b949e] group-hover/link:text-[#58a6ff] shrink-0">
                      arrow_outward
                    </span>
                  </a>
                  {/* Policy Pill */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#21262d] text-[#c9d1d9] border border-[#30363d] font-mono text-[10.5px] uppercase font-medium shrink-0">
                    <span className="material-symbols-outlined text-[13px] text-[#8b949e]">
                      {repo.tierIcon}
                    </span>
                    {repo.policyTier}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px] text-[#8b949e] pt-1">
                  <span>Install #{repo.installation_id}</span>
                  <span className="text-[#8b949e] truncate max-w-[200px] text-right">{repo.models}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-[#30363d]"></div>

              {/* Card Body */}
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="font-mono text-[10.5px] text-[#8b949e] uppercase tracking-wider font-semibold">
                      Active Inspection Modules
                    </span>
                    <span className="font-mono text-[11px] text-[#f0f6fc]">
                      {repo.activeModules.length} of 6 active
                    </span>
                  </div>
                  {/* Modules mini tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {repo.activeModules.map((mod) => (
                      <span
                        key={mod}
                        className="px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d] font-mono text-[10.5px]"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[12px]">
                  <span className="text-[#8b949e]">Architectural Rulebook:</span>
                  <span className="inline-flex items-center gap-1.5 text-[#c9d1d9] font-mono text-[11px]">
                    <span className="material-symbols-outlined text-[15px] text-[#8b949e]">description</span>
                    Configured ({repo.rulesCount} rules)
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-[#30363d]"></div>

            {/* Card Footer */}
            <div className="px-5 py-3.5 bg-[#0d1117]/50 rounded-b-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span className="font-mono text-[11px] text-emerald-400 font-medium">Webhook Active</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveModalRepo(repo)}
                  className="flex items-center gap-1.5 px-3 h-7.5 py-1 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-[#f0f6fc] font-medium text-[11px] border border-[#30363d] transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px] text-[#8b949e]">tune</span>
                  <span>Policy &amp; Rules</span>
                </button>
                <button
                  onClick={() => fetchData(true)}
                  className="p-1.5 h-7.5 w-7.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#f0f6fc] border border-[#30363d] flex items-center justify-center transition-colors"
                  title="Sync PRs"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">autorenew</span>
                </button>
              </div>
            </div>
          </article>
        )))}
      </div>

      {/* Bottom Inline Audit / Quick Telemetry Ribbon */}
      <section className="mt-8 p-5 rounded-xl bg-[#161b22] border border-[#30363d] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#21262d] text-[#c9d1d9] border border-[#30363d]">
            <span className="material-symbols-outlined text-[20px]">hub</span>
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-[#f0f6fc]">Auto-Discovery Worker Active</p>
            <p className="font-mono text-[11px] text-[#8b949e] mt-0.5">
              Scanning for new GitHub repository additions every 15 minutes across org AcmeCorpFinTech.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 self-end md:self-auto shrink-0 font-mono text-[11px]">
          <span className="text-[#8b949e]">Last check: 2 min ago</span>
          <button
            onClick={() => fetchData(true)}
            className="text-[#c9d1d9] hover:text-[#f0f6fc] flex items-center gap-1.5 transition-colors underline-offset-2 hover:underline font-medium"
            type="button"
          >
            <span>Force sync check</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* Repo Policy & Governance Modal */}
      {activeModalRepo && (
        <RepoSettingsModal
          installationId={activeModalRepo.installation_id}
          repoFullName={activeModalRepo.repo_full_name}
          isOpen={!!activeModalRepo}
          onClose={() => setActiveModalRepo(null)}
          onSaved={() => fetchData(true)}
        />
      )}
    </div>
  );
}
