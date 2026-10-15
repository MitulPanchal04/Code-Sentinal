"use client";

import { useState, useEffect } from "react";
import { api, type RepoSettings } from "@/lib/api";
import {
  X,
  Shield,
  ShieldCheck,
  Bug,
  Code2,
  FileText,
  CheckCircle2,
  Sliders,
  Zap,
  AlertCircle,
  BookOpen,
  Settings,
  Plus,
  Loader2,
  Check,
  HelpCircle,
} from "lucide-react";

interface RepoSettingsModalProps {
  installationId: number;
  repoFullName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (newSettings: RepoSettings) => void;
}

const PRESETS = {
  lenient: {
    name: "Lenient",
    badge: "⚡ Internal Dev & Testing",
    description:
      "Minimal friction for rapid prototyping. Scans only for critical bugs and severe vulnerabilities. Skips style, comment, and test coverage checks.",
    enabled_agents: ["security", "bugs"],
    min_severity: "warning",
    min_confidence: 85,
    max_findings: 15,
  },
  standard: {
    name: "Standard",
    badge: "⚖️ Production Default",
    description:
      "Balanced squad review covering security, logic, error handling, style, and comments with sensible thresholds.",
    enabled_agents: [
      "security",
      "bugs",
      "error_handling",
      "style",
      "test_coverage",
      "comment_accuracy",
    ],
    min_severity: "info",
    min_confidence: 75,
    max_findings: 25,
  },
  strict: {
    name: "Strict",
    badge: "🛡️ Client & Mission Critical",
    description:
      "Zero-tolerance policy. Flags edge-case errors, architectural deviations, missing test coverage, and documentation drift.",
    enabled_agents: [
      "security",
      "bugs",
      "error_handling",
      "style",
      "test_coverage",
      "comment_accuracy",
    ],
    min_severity: "info",
    min_confidence: 60,
    max_findings: 35,
  },
  custom: {
    name: "Custom",
    badge: "⚙️ Custom Configuration",
    description:
      "Manually select active agents, severity gates, confidence cutoffs, and tailored invariants.",
  },
};

const AGENT_CATALOG = [
  {
    id: "security",
    name: "Security Sentinel",
    icon: Shield,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    desc: "Detects CVEs, secrets leakage, OWASP Top 10, SQLi, and unauthorized access.",
  },
  {
    id: "bugs",
    name: "Bugs & Concurrency",
    icon: Bug,
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    desc: "Detects null-pointer dereferences, off-by-one errors, race conditions, and memory leaks.",
  },
  {
    id: "error_handling",
    name: "Error Handling & Resilience",
    icon: AlertCircle,
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    desc: "Catches unhandled promise rejections, empty catches, missing retries, and crash risks.",
  },
  {
    id: "style",
    name: "Clean Code & Style",
    icon: Code2,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    desc: "Enforces idiom consistency, naming conventions, dead code removal, and clean architecture.",
  },
  {
    id: "test_coverage",
    name: "Test Coverage Assurance",
    icon: CheckCircle2,
    color: "text-green-400 bg-green-500/10 border-green-500/20",
    desc: "Pinpoints untested edge cases, missing unit/integration tests, and assertion gaps.",
  },
  {
    id: "comment_accuracy",
    name: "Docs & Docstring Integrity",
    icon: FileText,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    desc: "Identifies stale comments, misleading docstrings, and documentation drift against real code.",
  },
];

const RULE_TEMPLATES = [
  {
    label: "Tenant Isolation",
    snippet: "- All database queries and service methods MUST filter by `tenant_id`.",
  },
  {
    label: "PII & Secrets",
    snippet:
      "- NEVER log or persist PII (passwords, tokens, emails, phone numbers, auth credentials).",
  },
  {
    label: "Immutable State",
    snippet:
      "- State mutations must be immutable; never mutate objects or arrays directly.",
  },
  {
    label: "API Compatibility",
    snippet:
      "- Public API schemas cannot remove or rename existing fields without deprecation.",
  },
  {
    label: "Mandatory Tests",
    snippet:
      "- Every new feature, endpoint, or utility function MUST include corresponding unit tests.",
  },
];

export function RepoSettingsModal({
  installationId,
  repoFullName,
  isOpen,
  onClose,
  onSaved,
}: RepoSettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings state
  const [profile, setProfile] = useState<string>("standard");
  const [rulebook, setRulebook] = useState<string>("");
  const [enabledAgents, setEnabledAgents] = useState<string[]>([
    "security",
    "bugs",
    "error_handling",
    "style",
    "test_coverage",
    "comment_accuracy",
  ]);
  const [minSeverity, setMinSeverity] = useState<string>("info");
  const [minConfidence, setMinConfidence] = useState<number>(75);
  const [maxFindings, setMaxFindings] = useState<number>(25);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    setSavedSuccess(false);

    api
      .getRepoSettings(installationId, repoFullName)
      .then((res) => {
        if (!mounted) return;
        const s = res.settings;
        setProfile(s.profile || "standard");
        setRulebook(s.rulebook || "");
        setEnabledAgents(
          s.enabled_agents || [
            "security",
            "bugs",
            "error_handling",
            "style",
            "test_coverage",
            "comment_accuracy",
          ]
        );
        setMinSeverity(s.min_severity || "info");
        setMinConfidence(s.min_confidence ?? 75);
        setMaxFindings(s.max_findings ?? 25);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load repository settings");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, installationId, repoFullName]);

  if (!isOpen) return null;

  const handleSelectPreset = (key: "lenient" | "standard" | "strict" | "custom") => {
    setProfile(key);
    if (key === "lenient") {
      setEnabledAgents(PRESETS.lenient.enabled_agents);
      setMinSeverity(PRESETS.lenient.min_severity);
      setMinConfidence(PRESETS.lenient.min_confidence);
      setMaxFindings(PRESETS.lenient.max_findings);
    } else if (key === "standard") {
      setEnabledAgents(PRESETS.standard.enabled_agents);
      setMinSeverity(PRESETS.standard.min_severity);
      setMinConfidence(PRESETS.standard.min_confidence);
      setMaxFindings(PRESETS.standard.max_findings);
    } else if (key === "strict") {
      setEnabledAgents(PRESETS.strict.enabled_agents);
      setMinSeverity(PRESETS.strict.min_severity);
      setMinConfidence(PRESETS.strict.min_confidence);
      setMaxFindings(PRESETS.strict.max_findings);
    }
  };

  const toggleAgent = (agentId: string) => {
    setProfile("custom");
    setEnabledAgents((prev) =>
      prev.includes(agentId) ? prev.filter((a) => a !== agentId) : [...prev, agentId]
    );
  };

  const handleInsertTemplate = (snippet: string) => {
    setRulebook((prev) => (prev ? `${prev.trim()}\n${snippet}` : snippet));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<RepoSettings> = {
        profile,
        rulebook,
        enabled_agents: enabledAgents,
        min_severity: minSeverity,
        min_confidence: Number(minConfidence),
        max_findings: Number(maxFindings),
      };

      await api.updateRepoSettings(installationId, repoFullName, payload);
      setSavedSuccess(true);
      if (onSaved) {
        onSaved({
          profile,
          rulebook,
          enabled_agents: enabledAgents,
          min_severity: minSeverity,
          min_confidence: Number(minConfidence),
          max_findings: Number(maxFindings),
          ignore_paths: [],
          critical_paths: [],
        });
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl my-6 flex flex-col max-h-[92vh] overflow-hidden text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Review Policy & Rulebook
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                {repoFullName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Loading repository settings...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-400">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* SECTION 1: PROFILE PRESETS */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Zap size={16} className="text-primary" />
                    Review Strictness Preset
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Select a base policy or customize below
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Lenient Card */}
                  <button
                    type="button"
                    onClick={() => handleSelectPreset("lenient")}
                    className={`text-left rounded-lg border p-3.5 transition-all relative ${
                      profile === "lenient"
                        ? "border-amber-500/60 bg-amber-500/10 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/30"
                        : "border-border bg-card/50 hover:border-border/80 hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Zap size={13} />
                        Lenient
                      </span>
                      {profile === "lenient" && (
                        <Check size={14} className="text-amber-400 font-bold" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      For internal dev & testing. Bypasses style & docs, catching only breaking bugs & security flaws.
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                        2 Agents
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        Min Sev: Warning
                      </span>
                    </div>
                  </button>

                  {/* Standard Card */}
                  <button
                    type="button"
                    onClick={() => handleSelectPreset("standard")}
                    className={`text-left rounded-lg border p-3.5 transition-all relative ${
                      profile === "standard"
                        ? "border-blue-500/60 bg-blue-500/10 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/30"
                        : "border-border bg-card/50 hover:border-border/80 hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                        <Shield size={13} />
                        Standard
                      </span>
                      {profile === "standard" && (
                        <Check size={14} className="text-blue-400 font-bold" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Default balanced coverage. Runs all review specialists with standard confidence checks.
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
                        All 6 Agents
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        Balanced
                      </span>
                    </div>
                  </button>

                  {/* Strict Card */}
                  <button
                    type="button"
                    onClick={() => handleSelectPreset("strict")}
                    className={`text-left rounded-lg border p-3.5 transition-all relative ${
                      profile === "strict"
                        ? "border-purple-500/60 bg-purple-500/10 shadow-sm shadow-purple-500/10 ring-1 ring-purple-500/30"
                        : "border-border bg-card/50 hover:border-border/80 hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                        <ShieldCheck size={13} />
                        Strict
                      </span>
                      {profile === "strict" && (
                        <Check size={14} className="text-purple-400 font-bold" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      For client & production-critical repositories. High-rigor review with mandatory test scrutiny.
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
                        Zero Tolerance
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        High Assurance
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* SECTION 2: ACTIVE AGENT SQUAD */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Shield size={16} className="text-primary" />
                    Review Agent Squad
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {enabledAgents.length} of {AGENT_CATALOG.length} active
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Disabled agents are skipped entirely, taking 0 seconds and consuming 0 LLM tokens.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AGENT_CATALOG.map((agent) => {
                    const active = enabledAgents.includes(agent.id);
                    const Icon = agent.icon;
                    return (
                      <div
                        key={agent.id}
                        onClick={() => toggleAgent(agent.id)}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all ${
                          active
                            ? "border-primary/40 bg-accent/30"
                            : "border-border/60 bg-card/40 opacity-60 hover:opacity-85"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => {}} // handled by parent div
                          className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4 shrink-0 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Icon size={14} className="text-primary shrink-0" />
                            <span className="text-xs font-semibold text-foreground">
                              {agent.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                            {agent.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: THRESHOLDS & GATES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg border border-border/80 bg-muted/10 p-4">
                {/* Min Severity */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Minimum Severity
                  </label>
                  <select
                    value={minSeverity}
                    onChange={(e) => {
                      setProfile("custom");
                      setMinSeverity(e.target.value);
                    }}
                    className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="info">Info (Report Everything)</option>
                    <option value="warning">Warning (Filter Out Trivial)</option>
                    <option value="critical">Critical (Blocker Only)</option>
                  </select>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Findings below this level are ignored.
                  </span>
                </div>

                {/* Min Confidence */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-foreground">
                      Min Confidence
                    </label>
                    <span className="text-xs font-mono font-bold text-primary">
                      {minConfidence}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={minConfidence}
                    onChange={(e) => {
                      setProfile("custom");
                      setMinConfidence(Number(e.target.value));
                    }}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Lower confidence catches subtle issues.
                  </span>
                </div>

                {/* Max Findings */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-foreground">
                      Max Findings Cap
                    </label>
                    <span className="text-xs font-mono font-bold text-primary">
                      {maxFindings}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={maxFindings}
                    onChange={(e) => {
                      setProfile("custom");
                      setMaxFindings(Number(e.target.value));
                    }}
                    className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Prevents overwhelming PR authors.
                  </span>
                </div>
              </div>

              {/* SECTION 4: REPOSITORY RULEBOOK */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen size={16} className="text-primary" />
                    Custom Repository Rulebook & Invariants
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Direct prompt injection into all agents
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2.5">
                  Specify architectural invariants, internal coding standards, or domain rules that
                  the agents must enforce strictly for this repository.
                </p>

                {/* Quick Templates */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                  <span className="text-[11px] text-muted-foreground mr-1 flex items-center gap-1">
                    <Plus size={11} /> Quick rules:
                  </span>
                  {RULE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.label}
                      type="button"
                      onClick={() => handleInsertTemplate(tmpl.snippet)}
                      className="rounded border border-border/80 bg-card px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      +{tmpl.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <textarea
                    rows={6}
                    value={rulebook}
                    onChange={(e) => setRulebook(e.target.value)}
                    placeholder={`e.g.\n- All database queries MUST include tenant_id.\n- Never log PII (email, phone, credit card numbers).\n- React components must use functional components and hooks.\n- Any public API endpoint change requires backward-compatibility.`}
                    className="w-full rounded-lg border border-border bg-card/60 p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none leading-relaxed"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground">
                    {rulebook.length} characters
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3.5 bg-muted/20">
          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-green-400 animate-in fade-in">
                <Check size={14} />
                Policy updated successfully!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={13} />
                  Save Policy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
