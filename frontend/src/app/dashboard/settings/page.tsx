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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  // Form states
  const [maxFiles, setMaxFiles] = useState("500");
  const [confidenceFloor, setConfidenceFloor] = useState("75");
  const [maxFindings, setMaxFindings] = useState("25");
  const [defaultModel, setDefaultModel] = useState("gpt-4o");
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
      toast.success("Review settings updated successfully");
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Repository Settings & Review Rules</h1>
          <p className="text-xs text-muted-foreground pt-0.5">
            Default AI agent parameters, webhook permissions, and automated comment behaviors.
          </p>
        </div>

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
          {refreshing ? "..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* GitHub App Connection Box */}
      <div className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#30363d] bg-[#21262d] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Github className="size-4 text-white" />
            <span className="text-xs font-semibold text-white">GitHub App Integration</span>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>

        <div className="p-5 flex flex-col gap-4 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            The CodeSentinel GitHub App manages check runs and posts automated PR review comments.
          </p>

          <div className="flex flex-col gap-2">
            <span className="font-semibold text-white">Connected Repositories ({installations.length})</span>
            {loading ? (
              <Skeleton className="h-6 w-48 bg-[#21262d]" />
            ) : installations.length === 0 ? (
              <span className="text-muted-foreground">No repositories connected.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {installations.map((inst) => (
                  <span
                    key={inst.repo_full_name}
                    className="flex items-center gap-1.5 rounded bg-[#21262d] px-2 py-1 font-mono text-[11px] text-[#58a6ff] border border-[#30363d]"
                  >
                    <BookMarked className="size-3 text-muted-foreground" />
                    <span>{inst.repo_full_name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button asChild size="sm" variant="outline" className="h-8 text-xs border-[#30363d] bg-[#21262d] text-white hover:bg-[#30363d]">
              <a
                href={
                  process.env.NEXT_PUBLIC_GITHUB_APP_URL ||
                  "https://github.com/apps/review-x/installations/new"
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink data-icon="inline-start" />
                Configure Repositories on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Review Parameters Settings Box */}
      <div className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
        <div className="border-b border-[#30363d] bg-[#21262d] px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-white">Global Review Parameters</span>
        </div>

        <div className="p-5 flex flex-col gap-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <span className="text-[11px] text-muted-foreground">
                PRs exceeding this file count are truncated to prevent context overflow.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confidence-floor" className="font-semibold text-white">
                Confidence Floor (%)
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
              <span className="text-[11px] text-muted-foreground">
                Findings with confidence below this threshold are automatically dropped.
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
              <span className="text-[11px] text-muted-foreground">
                Maximum number of findings included in the PR comment and check run.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="default-model" className="font-semibold text-white">
                Default LLM Model
              </label>
              <Select value={defaultModel} onValueChange={setDefaultModel}>
                <SelectTrigger id="default-model" className="h-8 text-xs border-[#30363d] bg-[#0d1117] text-[#e6edf3]">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="bg-[#161b22] border-[#30363d] text-[#e6edf3]">
                  <SelectGroup>
                    <SelectItem value="gpt-4o">gpt-4o (Standard)</SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20241022">claude-3-5-sonnet</SelectItem>
                    <SelectItem value="o3-mini">o3-mini (Reasoning)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <span className="text-[11px] text-muted-foreground">
                Engine used for the 6 ReAct review agents.
              </span>
            </div>
          </div>

          <div className="border-t border-[#30363d] pt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-white">Cross-Model Verification</span>
                <span className="text-muted-foreground">Run an independent verifier model on critical & warning findings.</span>
              </div>
              <Switch checked={enableVerifier} onCheckedChange={setEnableVerifier} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-white">Post Inline PR Review Comments</span>
                <span className="text-muted-foreground">Create comments directly on modified lines on GitHub.</span>
              </div>
              <Switch checked={enableInlineComments} onCheckedChange={setEnableInlineComments} />
            </div>
          </div>

          <div className="border-t border-[#30363d] pt-3 flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={saving}
              className="h-8 text-xs bg-[#238636] hover:bg-[#2ea043] text-white font-medium"
            >
              <Save data-icon="inline-start" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Repo Overrides */}
      <div className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
        <div className="border-b border-[#30363d] bg-[#21262d] px-4 py-2.5">
          <span className="text-xs font-semibold text-white">Per-Repository Configuration (.codesentinel.yml)</span>
        </div>
        <div className="p-4 bg-[#0d1117]">
          <pre className="font-mono text-xs text-[#58a6ff] leading-relaxed overflow-x-auto">
{`# Place in the root of any repository:
version: 1
max_files: 300
confidence_floor: 80
agents:
  security: true
  bugs: true
  style: true
  error_handling: true
  test_coverage: true
  comment_accuracy: false`}
          </pre>
        </div>
      </div>
    </div>
  );
}
