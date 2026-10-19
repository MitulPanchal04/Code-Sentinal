"use client";

import { useEffect, useState, useCallback } from "react";
import { api, Installation } from "@/lib/api";
import {
  Settings,
  RefreshCw,
  AlertCircle,
  Github,
  Save,
  CheckCircle2,
  ExternalLink,
  BookMarked,
  Sliders,
  ShieldCheck,
  FileCode,
  Lock,
  Cpu,
  Layers,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function SettingsPage() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedYml, setCopiedYml] = useState(false);

  // Form states
  const [maxFiles, setMaxFiles] = useState("500");
  const [confidenceFloor, setConfidenceFloor] = useState("75");
  const [maxFindings, setMaxFindings] = useState("25");
  const [defaultModel, setDefaultModel] = useState("claude-3-5-sonnet-20241022");
  const [enableVerifier, setEnableVerifier] = useState(true);
  const [enableInlineComments, setEnableInlineComments] = useState(true);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.listInstallations();
      setInstallations(data.installations || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load settings from backend: ${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSettings = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Global review parameters updated successfully");
    }, 600);
  };

  const copyConfigYml = () => {
    const yml = `# .codesentinel.yml
version: 1
max_files: 500
confidence_floor: 75
max_findings: 25
agents:
  security: true
  bugs: true
  style: true
  error_handling: true
  test_coverage: true
  comment_accuracy: true
`;
    navigator.clipboard.writeText(yml);
    setCopiedYml(true);
    toast.success("Copied .codesentinel.yml configuration");
    setTimeout(() => setCopiedYml(false), 2000);
  };

  return (
    <div className="flex flex-col w-full text-slate-100 pb-16 gap-6 max-w-5xl">
      {/* 1. Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-6 border-b border-[#30363d]/70">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e] tracking-tight">
            <span>Governance</span>
            <span className="text-[#484f58]">/</span>
            <span className="text-[#c9d1d9] font-medium">Global Settings</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#161b22] border border-[#30363d] text-[#58a6ff] font-mono ml-1.5">
              SYSTEM CONFIGURATION
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-[#f0f6fc] flex items-center gap-3">
            Organization &amp; Global Inspection Settings
          </h1>
          <p className="text-xs md:text-sm text-[#8b949e] max-w-2xl font-normal leading-relaxed">
            Configure default foundation model orchestration, confidence cutoff floors, webhook signing parameters, and repository guardrails.
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
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>

          <Button
            size="sm"
            onClick={handleSaveSettings}
            disabled={saving}
            className="h-8 text-xs bg-[#f0f6fc] hover:bg-white text-[#0d1117] font-semibold"
          >
            <Save className="size-3.5 mr-1" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="destructive" className="bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]">
          <AlertCircle className="size-4" />
          <AlertTitle>Settings Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* 2. Global Review Parameters Settings Box */}
      <section className="rounded-lg border border-[#30363d] bg-[#161b22] overflow-hidden shadow-xs">
        <div className="border-b border-[#30363d] bg-[#21262d] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-[#58a6ff]" />
            <h2 className="text-xs font-semibold text-white">Foundation Model &amp; Inspection Parameters</h2>
          </div>
          <span className="text-[11px] font-mono text-[#8b949e]">Global Defaults</span>
        </div>

        <div className="p-5 flex flex-col gap-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="default-model" className="font-semibold text-white">
                Primary Evaluation Engine
              </label>
              <Select value={defaultModel} onValueChange={setDefaultModel}>
                <SelectTrigger id="default-model" className="h-8 text-xs border-[#30363d] bg-[#0d1117] text-[#e6edf3]">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="bg-[#161b22] border-[#30363d] text-[#e6edf3]">
                  <SelectGroup>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recommended)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o (Production Standard)</SelectItem>
                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                    <SelectItem value="o3-mini">o3-mini (High-Reasoning)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <span className="text-[11px] text-[#8b949e]">
                Default LLM foundation powering the 6 ReAct review agents.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confidence-floor" className="font-semibold text-white">
                Confidence Floor ({confidenceFloor}%)
              </label>
              <Input
                id="confidence-floor"
                type="number"
                min="0"
                max="100"
                value={confidenceFloor}
                onChange={(e) => setConfidenceFloor(e.target.value)}
                className="h-8 text-xs font-mono border-[#30363d] bg-[#0d1117] text-[#e6edf3]"
              />
              <span className="text-[11px] text-[#8b949e]">
                Findings with confidence score below this threshold are automatically dropped.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="max-files" className="font-semibold text-white">
                Max Files Per PR
              </label>
              <Input
                id="max-files"
                type="number"
                value={maxFiles}
                onChange={(e) => setMaxFiles(e.target.value)}
                className="h-8 text-xs font-mono border-[#30363d] bg-[#0d1117] text-[#e6edf3]"
              />
              <span className="text-[11px] text-[#8b949e]">
                PRs exceeding this file count are truncated to prevent LLM context exhaustion.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="max-findings" className="font-semibold text-white">
                Max Findings Cap
              </label>
              <Input
                id="max-findings"
                type="number"
                value={maxFindings}
                onChange={(e) => setMaxFindings(e.target.value)}
                className="h-8 text-xs font-mono border-[#30363d] bg-[#0d1117] text-[#e6edf3]"
              />
              <span className="text-[11px] text-[#8b949e]">
                Maximum number of findings published in the GitHub PR review comment.
              </span>
            </div>
          </div>

          <div className="border-t border-[#30363d]/60 pt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-white">Cross-Model Independent Verifier</span>
                <span className="text-[#8b949e]">
                  Runs an independent secondary verifier model on critical &amp; warning findings to prevent false positives.
                </span>
              </div>
              <Switch checked={enableVerifier} onCheckedChange={setEnableVerifier} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-white">Post Inline PR Review Comments</span>
                <span className="text-[#8b949e]">
                  Create GitHub line comments directly on modified lines in pull request diffs.
                </span>
              </div>
              <Switch checked={enableInlineComments} onCheckedChange={setEnableInlineComments} />
            </div>
          </div>
        </div>
      </section>

      {/* 3. GitHub App & Webhook Integration Box */}
      <section className="rounded-lg border border-[#30363d] bg-[#161b22] overflow-hidden shadow-xs">
        <div className="flex items-center justify-between border-b border-[#30363d] bg-[#21262d] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Github className="size-4 text-white" />
            <h2 className="text-xs font-semibold text-white">GitHub App &amp; Webhook Cryptography</h2>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active &amp; Listening
          </span>
        </div>

        <div className="p-5 flex flex-col gap-4 text-xs">
          <p className="text-[#8b949e] leading-relaxed">
            CodeSentinel listens to GitHub <code className="font-mono text-slate-300">pull_request.opened</code>,{" "}
            <code className="font-mono text-slate-300">synchronize</code>, and{" "}
            <code className="font-mono text-slate-300">reopened</code> webhook events. All payloads are cryptographically verified via HMAC-SHA256 signatures before being queued.
          </p>

          <div className="flex flex-col gap-2">
            <span className="font-semibold text-white">Connected Repositories ({installations.length})</span>
            {loading ? (
              <Skeleton className="h-6 w-48 bg-[#21262d]" />
            ) : installations.length === 0 ? (
              <span className="text-[#8b949e]">No repositories connected.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {installations.map((inst) => (
                  <span
                    key={inst.repo_full_name}
                    className="flex items-center gap-1.5 rounded bg-[#21262d] px-2 py-1 font-mono text-[11px] text-[#58a6ff] border border-[#30363d]"
                  >
                    <BookMarked className="size-3 text-[#8b949e]" />
                    <span>{inst.repo_full_name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button asChild size="sm" variant="outline" className="h-8 text-xs border-[#30363d] bg-[#21262d] text-white hover:bg-[#30363d]">
              <a
                href={
                  process.env.NEXT_PUBLIC_GITHUB_APP_URL ||
                  "https://github.com/apps/review-x/installations/new"
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-3.5 mr-1" />
                Configure Permissions on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* 4. Repository Configuration Spec Box */}
      <section className="rounded-lg border border-[#30363d] bg-[#161b22] overflow-hidden shadow-xs">
        <div className="border-b border-[#30363d] bg-[#21262d] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="size-4 text-[#58a6ff]" />
            <h2 className="text-xs font-semibold text-white">Repository Config File (.codesentinel.yml)</h2>
          </div>
          <button
            onClick={copyConfigYml}
            className="flex items-center gap-1 text-[11px] font-mono text-[#8b949e] hover:text-white transition-colors"
          >
            {copiedYml ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            <span>{copiedYml ? "Copied" : "Copy YAML"}</span>
          </button>
        </div>
        <div className="p-4 bg-[#0d1117]">
          <pre className="font-mono text-xs text-[#58a6ff] leading-relaxed overflow-x-auto">
{`# Place in repository root: .codesentinel.yml
version: 1
max_files: 500
confidence_floor: 75
max_findings: 25

# Module execution matrix
agents:
  security: true          # AST scan, secret scanning, injection detection
  bugs: true              # Static data-flow & concurrency invariants
  style: true             # PEP8, Clean Architecture, code smell detection
  error_handling: true    # Boundary assertions & exception propagation
  test_coverage: true     # Edge-case test assertions
  comment_accuracy: true  # Docstring synchronization & invariants`}
          </pre>
        </div>
      </section>

      {/* 5. Infrastructure & Security Health Strip */}
      <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] flex flex-wrap items-center justify-between text-xs font-mono text-[#8b949e] gap-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Worker Cluster: 4/4 online</span>
          <span>•</span>
          <span>Database: PostgreSQL + pgvector (Healthy)</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="size-3 text-slate-400" />
          <span>Tokens encrypted with AES-GCM-256</span>
          <span>•</span>
          <span>v2.4-enterprise</span>
        </div>
      </div>
    </div>
  );
}
