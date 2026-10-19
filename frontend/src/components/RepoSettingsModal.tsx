"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { api, type RepoSettings } from "@/lib/api";
import { marked } from "marked";
import {
  X,
  Shield,
  ShieldCheck,
  Bug,
  Code2,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  AlertCircle,
  BookOpen,
  Plus,
  Loader2,
  Check,
  Eye,
  Edit3,
  Filter,
  Gauge,
  Layers,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table as TableIcon,
  Heading2,
  Sparkles,
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
    id: "lenient",
    name: "Rapid Development & Testing",
    tagline: "High velocity for non-production & internal prototypes",
    description:
      "Bypasses stylistic, documentation, and non-blocking checks to minimize review friction. Focuses solely on critical runtime bugs and high-severity security vulnerabilities.",
    badge: "Low Noise",
    enabled_agents: ["security", "bugs"],
    min_severity: "warning",
    min_confidence: 85,
    max_findings: 15,
  },
  standard: {
    id: "standard",
    name: "Production Standard",
    tagline: "Balanced coverage for core feature repositories",
    description:
      "Comprehensive analysis across all 6 inspection dimensions. Applies industry-standard confidence thresholds to catch errors while maintaining high precision.",
    badge: "Recommended",
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
    id: "strict",
    name: "High-Assurance Enterprise",
    tagline: "Zero-tolerance for client projects & critical infrastructure",
    description:
      "Rigorous inspection policy. Enforces strict test coverage requirements, defensive error handling, and architectural invariants. Lower confidence cutoff flags subtle edge cases.",
    badge: "Maximum Rigor",
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
    max_findings: 40,
  },
  custom: {
    id: "custom",
    name: "Custom Policy",
    tagline: "Individually configured inspection parameters",
    description:
      "Tailored selection of active inspection agents, severity gates, confidence filters, and domain-specific rulebooks.",
    badge: "Customized",
  },
};

const AGENT_MODULES = [
  {
    id: "security",
    name: "Security Sentinel",
    category: "Vulnerabilities & Invariants",
    icon: Shield,
    desc: "Detects CVEs, secrets leakage, OWASP Top 10, SQLi, and authorization flaws.",
  },
  {
    id: "bugs",
    name: "Logic & Concurrency",
    category: "Runtime Stability",
    icon: Bug,
    desc: "Identifies null dereferences, race conditions, memory leaks, and off-by-one errors.",
  },
  {
    id: "error_handling",
    name: "Defensive Error Handling",
    category: "Resilience",
    icon: AlertCircle,
    desc: "Validates exception boundaries, unhandled rejections, and silent failures.",
  },
  {
    id: "style",
    name: "Code Quality & Consistency",
    category: "Clean Code",
    icon: Code2,
    desc: "Enforces design patterns, idiomatic conventions, and dead code cleanup.",
  },
  {
    id: "test_coverage",
    name: "Test Coverage Assurance",
    category: "Verification",
    icon: CheckCircle2,
    desc: "Pinpoints untested edge cases, missing test fixtures, and assertion gaps.",
  },
  {
    id: "comment_accuracy",
    name: "Documentation Integrity",
    category: "Specification",
    icon: FileText,
    desc: "Verifies docstring accuracy and catches outdated documentation drift.",
  },
];

const RULE_TEMPLATES = [
  {
    label: "Data Privacy & PII",
    content: `### Security & Privacy Invariant
- **No PII Logging**: Never log passwords, API tokens, user emails, phone numbers, or credit card details.
- **Sanitization**: All user input must pass through the schema validator prior to internal handling.`,
  },
  {
    label: "Tenant Isolation",
    content: `### Multi-Tenancy Invariant
- **Tenant Scoping**: Every database query and data layer method MUST explicitly include \`tenant_id\` filtering.
- **Cross-Tenant Guard**: Endpoints must verify tenant ownership before mutating shared resources.`,
  },
  {
    label: "Defensive Error Handling",
    content: `### Error Handling Policy
- **Explicit Failure Modes**: Asynchronous promises must have explicit catch handlers or error boundaries.
- **No Silent Failures**: Empty catch blocks are strictly prohibited; errors must be logged with structured metadata.`,
  },
  {
    label: "API Compatibility",
    content: `### Public API Contract Invariant
- **Backward Compatibility**: Field removals or type modifications on public endpoints require an explicit deprecation cycle.
- **Response Format**: All HTTP 4xx/5xx responses must conform to the standard RFC 7807 problem details specification.`,
  },
  {
    label: "Mandatory Testing",
    content: `### Testing Requirement
- **Coverage**: Every new business service, calculate function, or utility MUST include corresponding unit tests.
- **Negative Scenarios**: Tests must validate boundary edge cases and failure paths in addition to the happy path.`,
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

  // Settings State
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

  // Editor Tab State
  const [activeEditorTab, setActiveEditorTab] = useState<"write" | "preview">("write");
  const [showThresholdGuide, setShowThresholdGuide] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load existing settings on open
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

  // Markdown live preview compiled HTML
  const compiledMarkdown = useMemo(() => {
    if (!rulebook.trim()) {
      return "<p class='text-muted-foreground italic text-sm'>No rules defined yet. Use the Write tab or quick templates to define architectural invariants for this repository.</p>";
    }
    try {
      return marked.parse(rulebook, { breaks: true }) as string;
    } catch {
      return "<p class='text-red-400'>Error rendering markdown preview.</p>";
    }
  }, [rulebook]);

  if (!isOpen) return null;

  const handleSelectPreset = (key: "lenient" | "standard" | "strict") => {
    setProfile(key);
    const target = PRESETS[key];
    setEnabledAgents(target.enabled_agents);
    setMinSeverity(target.min_severity);
    setMinConfidence(target.min_confidence);
    setMaxFindings(target.max_findings);
  };

  const toggleAgent = (agentId: string) => {
    setProfile("custom");
    setEnabledAgents((prev) =>
      prev.includes(agentId) ? prev.filter((a) => a !== agentId) : [...prev, agentId]
    );
  };

  const insertMarkdownFormatting = (prefix: string, suffix: string = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = el.value.substring(start, end) || "text";
    const replacement = `${prefix}${selectedText}${suffix}`;
    const newValue = el.value.substring(0, start) + replacement + el.value.substring(end);
    setRulebook(newValue);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  const handleInsertTemplate = (snippet: string) => {
    setRulebook((prev) => (prev ? `${prev.trim()}\n\n${snippet}` : snippet));
    setActiveEditorTab("write");
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
      setError(err instanceof Error ? err.message : "Failed to persist repository settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl rounded-xl border border-border bg-card shadow-2xl my-6 flex flex-col max-h-[92vh] overflow-hidden text-foreground">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-border px-8 py-5 bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background shadow-xs text-primary">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Repository Governance & Review Policy
                </h2>
                <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                  {profile.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {repoFullName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-9">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28">
              <Loader2 className="h-9 w-9 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Retrieving policy parameters for {repoFullName}…
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
                  <AlertCircle size={18} className="shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. GOVERNANCE & STRICTNESS PRESETS */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                      <Layers size={16} className="text-primary" />
                      Strictness & Governance Preset
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select an enterprise baseline profile or adjust individual modules below.
                    </p>
                  </div>
                  {profile === "custom" && (
                    <span className="text-xs font-medium text-primary">
                      Custom configuration active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Lenient Card */}
                  <div
                    onClick={() => handleSelectPreset("lenient")}
                    className={`group relative flex flex-col justify-between rounded-xl border p-5 cursor-pointer transition-all ${
                      profile === "lenient"
                        ? "border-primary bg-accent/40 shadow-sm ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-border/80 hover:bg-muted/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                          {PRESETS.lenient.name}
                        </span>
                        {profile === "lenient" ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check size={12} />
                          </span>
                        ) : (
                          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {PRESETS.lenient.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground mb-1.5">
                        {PRESETS.lenient.tagline}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {PRESETS.lenient.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>2 Active Modules</span>
                      <span>Min Severity: Warning</span>
                    </div>
                  </div>

                  {/* Standard Card */}
                  <div
                    onClick={() => handleSelectPreset("standard")}
                    className={`group relative flex flex-col justify-between rounded-xl border p-5 cursor-pointer transition-all ${
                      profile === "standard"
                        ? "border-primary bg-accent/40 shadow-sm ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-border/80 hover:bg-muted/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                          {PRESETS.standard.name}
                        </span>
                        {profile === "standard" ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check size={12} />
                          </span>
                        ) : (
                          <span className="rounded bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {PRESETS.standard.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground mb-1.5">
                        {PRESETS.standard.tagline}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {PRESETS.standard.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>All 6 Modules</span>
                      <span>Balanced Confidence (75%)</span>
                    </div>
                  </div>

                  {/* Strict Card */}
                  <div
                    onClick={() => handleSelectPreset("strict")}
                    className={`group relative flex flex-col justify-between rounded-xl border p-5 cursor-pointer transition-all ${
                      profile === "strict"
                        ? "border-primary bg-accent/40 shadow-sm ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-border/80 hover:bg-muted/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                          {PRESETS.strict.name}
                        </span>
                        {profile === "strict" ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check size={12} />
                          </span>
                        ) : (
                          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {PRESETS.strict.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground mb-1.5">
                        {PRESETS.strict.tagline}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {PRESETS.strict.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>All 6 Modules</span>
                      <span>High Rigor (60% Cutoff)</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. SPECIALIZED INSPECTION MODULES */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                      <ShieldCheck size={16} className="text-primary" />
                      Specialized Inspection Modules
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enable or disable domain-specific review agents. Deactivated agents are bypassed instantly at 0 token cost.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {enabledAgents.length} of {AGENT_MODULES.length} active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {AGENT_MODULES.map((agent) => {
                    const active = enabledAgents.includes(agent.id);
                    const Icon = agent.icon;
                    return (
                      <div
                        key={agent.id}
                        onClick={() => toggleAgent(agent.id)}
                        className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer select-none transition-all ${
                          active
                            ? "border-primary/50 bg-accent/30 shadow-xs"
                            : "border-border/60 bg-card/40 opacity-55 hover:opacity-85"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                                  active
                                    ? "border-primary/30 bg-primary/10 text-primary"
                                    : "border-border bg-muted/50 text-muted-foreground"
                                }`}
                              >
                                <Icon size={14} />
                              </div>
                              <span className="text-xs font-semibold text-foreground">
                                {agent.name}
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => {}}
                              className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                            />
                          </div>
                          <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block mb-1">
                            {agent.category}
                          </span>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {agent.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 3. QUALITY GATES & STRICTNESS THRESHOLDS */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                      <Filter size={16} className="text-primary" />
                      Quality Gates & Strictness Thresholds
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Controls filtering sensitivity, certainty verification, and maximum output boundaries.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowThresholdGuide(!showThresholdGuide)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    <HelpCircle size={13} />
                    {showThresholdGuide ? "Hide Metric Guide" : "Explain Metrics"}
                  </button>
                </div>

                {/* Optional Expandable Metric Guide */}
                {showThresholdGuide && (
                  <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3.5 text-xs text-muted-foreground animate-in fade-in duration-150">
                    <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                      Metric Reference & Engineering Significance
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="font-semibold text-foreground block mb-1">
                          1. Minimum Severity
                        </span>
                        Filters out lower-severity noise. &quot;Info&quot; reports all stylistic nuances. &quot;Warning&quot; isolates bugs and code smells. &quot;Critical&quot; blocks only on fatal crashes and severe security risks.
                      </div>
                      <div>
                        <span className="font-semibold text-foreground block mb-1">
                          2. Confidence Floor (%)
                        </span>
                        Statistical certainty verification. Higher confidence (85%+) reports only incontrovertible flaws. Lower confidence (60%) catches elusive defects at the expense of potential false alarms.
                      </div>
                      <div>
                        <span className="font-semibold text-foreground block mb-1">
                          3. Max Findings Cap
                        </span>
                        Ceiling on reported findings per review. Findings are sorted by severity and confidence, and only the top N items are posted to prevent pull request fatigue.
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Minimum Severity Card */}
                  <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Filter size={13} className="text-primary" />
                        Minimum Severity
                      </label>
                      <span className="text-[11px] font-mono text-muted-foreground uppercase">
                        {minSeverity}
                      </span>
                    </div>

                    <select
                      value={minSeverity}
                      onChange={(e) => {
                        setProfile("custom");
                        setMinSeverity(e.target.value);
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="info">Info (Report All Observations)</option>
                      <option value="warning">Warning (Filter Out Trivial Notes)</option>
                      <option value="critical">Critical (Blocker Issues Only)</option>
                    </select>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Findings below this severity tier are discarded prior to review publication.
                    </p>
                  </div>

                  {/* Confidence Floor Card */}
                  <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Gauge size={13} className="text-primary" />
                        Confidence Floor
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
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Findings with statistical certainty below {minConfidence}% will be suppressed to avoid false positives.
                    </p>
                  </div>

                  {/* Max Findings Cap Card */}
                  <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <SlidersHorizontal size={13} className="text-primary" />
                        Max Findings Cap
                      </label>
                      <span className="text-xs font-mono font-bold text-primary">
                        {maxFindings} issues
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
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Upper bound on posted comments to prevent overwhelming engineers on large pull requests.
                    </p>
                  </div>
                </div>
              </section>

              {/* 4. REPOSITORY GOVERNANCE & ARCHITECTURAL RULEBOOK (MARKDOWN EDITOR) */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                      <BookOpen size={16} className="text-primary" />
                      Repository Rulebook & Architectural Invariants
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Markdown-formatted specifications injected directly into every AI agent prompt and orchestrator decision.
                    </p>
                  </div>

                  {/* Write vs Preview Tabs */}
                  <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveEditorTab("write")}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                        activeEditorTab === "write"
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Edit3 size={13} />
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEditorTab("preview")}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                        activeEditorTab === "preview"
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Eye size={13} />
                      Live Preview
                    </button>
                  </div>
                </div>

                {/* Quick Templates Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
                    <Sparkles size={12} className="text-primary" /> Standard Invariants:
                  </span>
                  {RULE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.label}
                      type="button"
                      onClick={() => handleInsertTemplate(tmpl.content)}
                      className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      title="Append this invariant template to your rulebook"
                    >
                      +{tmpl.label}
                    </button>
                  ))}
                </div>

                {/* Markdown Formatting Toolbar (Only in Write Mode) */}
                {activeEditorTab === "write" && (
                  <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => insertMarkdownFormatting("## ")}
                      className="p-1 rounded hover:bg-accent hover:text-foreground"
                      title="Heading 2"
                    >
                      <Heading2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownFormatting("**", "**")}
                      className="p-1 rounded hover:bg-accent hover:text-foreground"
                      title="Bold"
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownFormatting("*", "*")}
                      className="p-1 rounded hover:bg-accent hover:text-foreground"
                      title="Italic"
                    >
                      <Italic size={14} />
                    </button>
                    <div className="h-4 w-px bg-border mx-1" />
                    <button
                      type="button"
                      onClick={() => insertMarkdownFormatting("`", "`")}
                      className="p-1 rounded hover:bg-accent hover:text-foreground"
                      title="Inline Code"
                    >
                      <Code size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownFormatting("```typescript\n", "\n```")}
                      className="p-1 rounded hover:bg-accent hover:text-foreground"
                      title="Code Block"
                    >
                      <span className="font-mono text-xs font-bold">&lt;/&gt;</span>
                    </button>
                    <div className="h-4 w-px bg-border mx-1" />
                    <button
                      type="button"
                      onClick={() => insertMarkdownFormatting("- ")}
                      className="p-1 rounded hover:bg-accent hover:text-foreground"
                      title="Bullet List"
                    >
                      <List size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownFormatting("1. ")}
                      className="p-1 rounded hover:bg-accent hover:text-foreground"
                      title="Numbered List"
                    >
                      <ListOrdered size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownFormatting("- [ ] ")}
                      className="p-1 rounded hover:bg-accent hover:text-foreground"
                      title="Checklist Item"
                    >
                      <CheckSquare size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownFormatting("> ")}
                      className="p-1 rounded hover:bg-accent hover:text-foreground"
                      title="Blockquote"
                    >
                      <Quote size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertMarkdownFormatting(
                          "| Invariant | Rationale |\n|---|---|\n| Rule description | Justification |\n"
                        )
                      }
                      className="p-1 rounded hover:bg-accent hover:text-foreground"
                      title="Table"
                    >
                      <TableIcon size={14} />
                    </button>
                  </div>
                )}

                {/* Editor or Preview Pane */}
                <div className="relative">
                  {activeEditorTab === "write" ? (
                    <textarea
                      ref={textareaRef}
                      rows={14}
                      value={rulebook}
                      onChange={(e) => setRulebook(e.target.value)}
                      placeholder={`# Repository Architectural Invariants & Review Policy\n\n## Mandatory Security Standards\n- Never log or persist PII or credentials in application logs.\n- All database transactions must enforce tenant scoping.\n\n## Code Conventions\n- React components must adhere to functional composition and hooks.\n- Public API interfaces cannot introduce breaking changes without deprecation.`}
                      className="w-full rounded-b-xl border border-border bg-card p-4 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none leading-relaxed min-h-[340px]"
                    />
                  ) : (
                    <div className="w-full rounded-xl border border-border bg-card p-6 min-h-[340px] max-h-[480px] overflow-y-auto">
                      <div
                        className="markdown-preview"
                        dangerouslySetInnerHTML={{ __html: compiledMarkdown }}
                      />
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Markdown syntax supported (headings, tables, code blocks, checklists)
                    </span>
                    <span className="font-mono">{rulebook.length} characters</span>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between border-t border-border px-8 py-4 bg-muted/20">
          <div>
            {savedSuccess && (
              <span className="flex items-center gap-2 text-xs font-semibold text-green-500 animate-in fade-in">
                <Check size={15} />
                Governance policy successfully updated for {repoFullName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Persisting Policy…
                </>
              ) : (
                <>
                  <Check size={14} />
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
