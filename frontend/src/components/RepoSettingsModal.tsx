"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { api, type RepoSettings } from "@/lib/api";
import { marked } from "marked";

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
    name: "Rapid Dev & Testing",
    tagline: "Low Noise",
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
    tagline: "Balanced Inspection",
    description:
      "Comprehensive balanced inspection across all 6 dimensions. Applies industry-standard confidence thresholds to catch errors while maintaining high precision.",
    badge: "RECOMMENDED",
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
    name: "High-Assurance FinTech",
    tagline: "Zero Tolerance",
    description:
      "Rigorous inspection policy for client deliverables and financial services. Flags edge-case logic and enforces test coverage.",
    badge: "Zero Tolerance",
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
};

const AGENT_MODULES = [
  {
    id: "security",
    name: "Security Sentinel",
    category: "Vulnerabilities & Invariants",
    icon: "security",
    desc: "Detects CVEs, secrets leakage, OWASP Top 10, SQLi, and authorization flaws.",
  },
  {
    id: "bugs",
    name: "Logic & Concurrency",
    category: "Runtime Stability",
    icon: "memory",
    desc: "Identifies null dereferences, race conditions, memory leaks, and off-by-one errors.",
  },
  {
    id: "error_handling",
    name: "Defensive Error Handling",
    category: "Resilience",
    icon: "crisis_alert",
    desc: "Validates exception boundaries, unhandled rejections, and silent failures.",
  },
  {
    id: "style",
    name: "Code Quality & Style",
    category: "Clean Code",
    icon: "verified",
    desc: "Enforces design patterns, idiomatic conventions, and dead code cleanup.",
  },
  {
    id: "test_coverage",
    name: "Test Coverage Assurance",
    category: "Verification",
    icon: "rule",
    desc: "Pinpoints untested edge cases, missing test fixtures, and assertion gaps.",
  },
  {
    id: "comment_accuracy",
    name: "Documentation Integrity",
    category: "Specification",
    icon: "menu_book",
    desc: "Verifies docstring accuracy and catches outdated documentation drift.",
  },
];

const RULE_TEMPLATES = [
  {
    label: "+ Data Privacy & PII",
    content: `### Security & Privacy Invariants\n- **No PII Logging**: Never log passwords, API tokens, user emails, or credentials.\n- **Sanitization**: All user input must pass through schema validation prior to processing.`,
  },
  {
    label: "+ Tenant Isolation",
    content: `### Multi-Tenancy Invariants\n- **Tenant Scoping**: All database queries MUST explicitly include \`tenant_id\` filtering.\n- **Context Propagation**: Always forward the authenticated \`tenant_id\` in inter-service RPC headers.`,
  },
  {
    label: "+ Defensive Error Handling",
    content: `### Resilience Invariants\n- **Async Handlers**: Promise rejections must be caught with explicit error boundaries.\n- **No Silent Swallowing**: Catch blocks must log structured telemetry or rethrow as a domain error.`,
  },
  {
    label: "+ API Compatibility",
    content: `### API Contract Invariants\n- **Backward Compatibility**: Field removals or type mutations require a prior deprecation cycle.\n- **Contract Versioning**: Public schema changes must increment the major/minor semver identifier.`,
  },
  {
    label: "+ Mandatory Testing",
    content: `### Verification Invariants\n- **Coverage Requirement**: All new business services require corresponding unit tests.\n- **Integration Tests**: Critical payment and authentication routes must include contract integration tests.`,
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Settings State
  const [selectedPreset, setSelectedPreset] = useState<"lenient" | "standard" | "strict" | "custom">("standard");
  const [enabledAgents, setEnabledAgents] = useState<string[]>([
    "security",
    "bugs",
    "error_handling",
    "style",
    "test_coverage",
    "comment_accuracy",
  ]);
  const [minSeverity, setMinSeverity] = useState<"info" | "warning" | "error">("warning");
  const [minConfidence, setMinConfidence] = useState(75);
  const [maxFindings, setMaxFindings] = useState(25);
  const [customPrompt, setCustomPrompt] = useState("");
  const [previewMode, setPreviewMode] = useState<"write" | "preview">("write");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch settings on open
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    setSuccess(false);

    api
      .getRepoSettings(installationId, repoFullName)
      .then((res) => {
        if (!mounted) return;
        const settings = res.settings;
        setEnabledAgents(settings.enabled_agents || []);
        setMinSeverity((settings.min_severity as "info" | "warning" | "error") || "warning");
        setMinConfidence(settings.min_confidence ?? 75);
        setMaxFindings(settings.max_findings ?? 25);
        setCustomPrompt(settings.rulebook || "");

        // Determine preset
        if (settings.min_confidence === 85 && settings.min_severity === "warning") {
          setSelectedPreset("lenient");
        } else if (settings.min_confidence === 60) {
          setSelectedPreset("strict");
        } else if (settings.min_confidence === 75) {
          setSelectedPreset("standard");
        } else {
          setSelectedPreset("custom");
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn("Using default settings due to error:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, installationId, repoFullName]);

  const applyPreset = (presetKey: "lenient" | "standard" | "strict") => {
    const p = PRESETS[presetKey];
    setSelectedPreset(presetKey);
    setEnabledAgents(p.enabled_agents);
    setMinSeverity(p.min_severity as "info" | "warning" | "error");
    setMinConfidence(p.min_confidence);
    setMaxFindings(p.max_findings);
  };

  const toggleAgent = (id: string) => {
    setSelectedPreset("custom");
    setEnabledAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const insertTemplate = (content: string) => {
    setCustomPrompt((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n\n${content}` : content;
    });
  };

  const handleToolbarAction = (syntax: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = customPrompt;
    const selection = text.substring(start, end) || "text";

    let replacement = "";
    switch (syntax) {
      case "h2":
        replacement = `\n## ${selection}\n`;
        break;
      case "bold":
        replacement = `**${selection}**`;
        break;
      case "italic":
        replacement = `*${selection}*`;
        break;
      case "code":
        replacement = `\`${selection}\``;
        break;
      case "codeblock":
        replacement = `\n\`\`\`\n${selection}\n\`\`\`\n`;
        break;
      case "bullet":
        replacement = `\n- ${selection}`;
        break;
      case "number":
        replacement = `\n1. ${selection}`;
        break;
      case "check":
        replacement = `\n- [ ] ${selection}`;
        break;
      case "quote":
        replacement = `\n> ${selection}`;
        break;
      case "table":
        replacement = `\n| Invariant | Scope | Severity |\n| :--- | :--- | :--- |\n| Strict Schema | API | High |\n`;
        break;
    }

    const nextText = text.substring(0, start) + replacement + text.substring(end);
    setCustomPrompt(nextText);
  };

  const renderedMarkdown = useMemo(() => {
    if (!customPrompt) return "<p class='text-[#8b949e] italic'>No architectural rules defined yet. Use the presets above or type markdown rules.</p>";
    return marked.parse(customPrompt);
  }, [customPrompt]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<RepoSettings> = {
        enabled_agents: enabledAgents,
        min_severity: minSeverity,
        min_confidence: minConfidence,
        max_findings: maxFindings,
        rulebook: customPrompt,
      };
      await api.updateRepoSettings(installationId, repoFullName, payload);
      setSuccess(true);
      if (onSaved) onSaved(payload as RepoSettings);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to save policy: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* EXPANSIVE DEVELOPER MODAL CONTAINER */}
      <div className="w-full max-w-6xl max-h-[942px] rounded-xl border border-[#30363d] bg-[#0d1117] shadow-2xl flex flex-col overflow-hidden text-[#c9d1d9] antialiased animate-in fade-in zoom-in-95 duration-150">
        {/* 1. MODAL HEADER */}
        <div className="sticky top-0 z-20 border-b border-[#30363d] px-7 py-5 flex items-center justify-between bg-[#161b22]/90 backdrop-blur">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#0d1117] border border-[#30363d] text-neutral-200 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold text-[#f0f6fc] tracking-tight">
                Repository Governance &amp; Review Policy
              </h2>
              <span className="font-mono text-xs text-[#8b949e]">
                {repoFullName} • Installation #{installationId}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors border border-transparent hover:border-[#30363d]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* 2. MODAL BODY (SCROLLABLE WORKBENCH) */}
        <div className="p-7 md:p-9 space-y-10 overflow-y-auto max-h-[calc(92vh-130px)] divide-y divide-[#21262d]">
          {error && (
            <div className="p-3.5 bg-red-950/40 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[17px] text-red-400">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* SECTION A: STRICTNESS & GOVERNANCE PRESET SELECTOR */}
          <section className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-neutral-400 text-[18px]">policy</span>
                <h3 className="text-xs font-semibold tracking-wider uppercase text-neutral-300">
                  Strictness &amp; Governance Preset
                </h3>
              </div>
              <p className="text-xs text-[#8b949e] mt-1">
                Choose a baseline engineering policy or fine-tune individual modules below.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {/* Preset 1: Rapid Dev */}
              <div
                onClick={() => applyPreset("lenient")}
                className={`group relative rounded-xl border p-5 transition-all flex flex-col justify-between cursor-pointer ${
                  selectedPreset === "lenient"
                    ? "border-neutral-300 bg-[#1b222c] shadow-sm ring-1 ring-neutral-400/30"
                    : "border-[#30363d] bg-[#161b22] hover:border-neutral-500"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#f0f6fc]">Rapid Dev &amp; Testing</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-neutral-700 bg-neutral-800 text-neutral-400">
                      Low Noise
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#8b949e]">
                    Bypasses stylistic, documentation, and non-blocking checks to minimize review friction. Focuses solely on critical runtime bugs and high-severity security vulnerabilities.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-[#21262d] flex items-center justify-between text-[11px] font-mono text-[#8b949e]">
                  <span>2 Active Modules</span>
                  <span>Min: Warning</span>
                </div>
              </div>

              {/* Preset 2: Production Standard (Recommended) */}
              <div
                onClick={() => applyPreset("standard")}
                className={`relative rounded-xl border p-5 transition-all flex flex-col justify-between cursor-pointer ${
                  selectedPreset === "standard"
                    ? "border-neutral-300 bg-[#1b222c] shadow-sm ring-1 ring-neutral-400/30"
                    : "border-[#30363d] bg-[#161b22] hover:border-neutral-500"
                }`}
              >
                <div className="absolute -top-3 right-4 flex items-center gap-1.5 bg-neutral-200 text-neutral-900 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wide shadow">
                  <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  RECOMMENDED
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-sm font-semibold text-white">Production Standard</span>
                  </div>
                  <p className="text-xs leading-relaxed text-neutral-300">
                    Comprehensive balanced inspection across all 6 dimensions. Applies industry-standard confidence thresholds to catch errors while maintaining high precision.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-neutral-700/60 flex items-center justify-between text-[11px] font-mono text-neutral-200">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>All 6 Modules
                  </span>
                  <span className="font-semibold text-white">75% Confidence</span>
                </div>
              </div>

              {/* Preset 3: High-Assurance FinTech */}
              <div
                onClick={() => applyPreset("strict")}
                className={`group relative rounded-xl border p-5 transition-all flex flex-col justify-between cursor-pointer ${
                  selectedPreset === "strict"
                    ? "border-neutral-300 bg-[#1b222c] shadow-sm ring-1 ring-neutral-400/30"
                    : "border-[#30363d] bg-[#161b22] hover:border-neutral-500"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#f0f6fc]">High-Assurance FinTech</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-neutral-700 bg-neutral-800 text-neutral-400">
                      Zero Tolerance
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#8b949e]">
                    Rigorous inspection policy for client deliverables and financial services. Flags edge-case logic and enforces test coverage.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-[#21262d] flex items-center justify-between text-[11px] font-mono text-[#8b949e]">
                  <span>All 6 Modules</span>
                  <span>High Rigor (60% Cutoff)</span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION B: SPECIALIZED INSPECTION MODULES */}
          <section className="space-y-4 pt-9">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-neutral-400 text-[18px]">grid_view</span>
                <h3 className="text-xs font-semibold tracking-wider uppercase text-neutral-300">
                  Specialized Inspection Modules
                </h3>
              </div>
              <p className="text-xs text-[#8b949e] mt-1">
                Enable or disable domain-specific review agents. Deactivated agents are bypassed instantly at 0 token cost.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {AGENT_MODULES.map((module) => {
                const isChecked = enabledAgents.includes(module.id);
                return (
                  <div
                    key={module.id}
                    onClick={() => toggleAgent(module.id)}
                    className="p-4 rounded-xl border border-[#30363d] bg-[#161b22] hover:border-neutral-500 transition-colors flex items-start justify-between gap-3.5 group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-neutral-300 mt-0.5">
                        <span className="material-symbols-outlined text-[19px]">{module.icon}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#f0f6fc]">{module.name}</span>
                        </div>
                        <span className="text-[10.5px] font-mono text-neutral-400 block">{module.category}</span>
                        <p className="text-xs text-[#8b949e] leading-snug pt-0.5">{module.desc}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5 pointer-events-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="sr-only peer"
                      />
                      <div
                        className={`w-8 h-4.5 rounded-full transition-all relative ${
                          isChecked ? "bg-neutral-300" : "bg-neutral-800"
                        }`}
                      >
                        <span
                          className={`absolute top-[2px] left-[2px] bg-white border border-neutral-300 rounded-full h-3.5 w-3.5 transition-transform ${
                            isChecked ? "translate-x-3.5" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION C: QUALITY GATES & STRICTNESS THRESHOLDS */}
          <section className="space-y-4 pt-9">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-neutral-400 text-[18px]">instant_mix</span>
                  <h3 className="text-xs font-semibold tracking-wider uppercase text-neutral-300">
                    Quality Gates &amp; Strictness Thresholds
                  </h3>
                </div>
                <p className="text-xs text-[#8b949e] mt-1">
                  Controls filtering sensitivity, certainty verification, and maximum output boundaries.
                </p>
              </div>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">help</span>
                Explain Metrics
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {/* Card 1: Minimum Severity */}
              <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22] space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-300">Minimum Severity</span>
                  <span className="text-[10px] font-mono text-[#8b949e]">Threshold Gate</span>
                </div>
                <div className="relative">
                  <select
                    value={minSeverity}
                    onChange={(e) => {
                      setSelectedPreset("custom");
                      setMinSeverity(e.target.value as "info" | "warning" | "error");
                    }}
                    className="w-full h-9 bg-[#0d1117] border border-[#30363d] focus:border-neutral-400 rounded-md px-3 text-xs text-[#f0f6fc] font-medium appearance-none cursor-pointer focus:outline-none"
                  >
                    <option value="warning">Warning (Filter Out Trivial Notes)</option>
                    <option value="error">Error (Critical Blockers Only)</option>
                    <option value="info">Info (Comprehensive Logging)</option>
                  </select>
                  <span className="material-symbols-outlined text-[16px] text-neutral-400 absolute right-3 top-2.5 pointer-events-none">
                    unfold_more
                  </span>
                </div>
                <p className="text-[11.5px] text-[#8b949e] leading-relaxed">
                  Findings below this severity tier are discarded prior to review publication.
                </p>
              </div>

              {/* Card 2: Confidence Floor */}
              <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22] space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-300">Confidence Floor</span>
                  <span className="text-xs font-mono font-semibold text-white">{minConfidence}% certainty</span>
                </div>
                <div className="pt-2 pb-1">
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={minConfidence}
                    onChange={(e) => {
                      setSelectedPreset("custom");
                      setMinConfidence(Number(e.target.value));
                    }}
                    className="w-full h-1.5 bg-[#21262d] rounded-lg appearance-none cursor-pointer accent-neutral-200"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500 mt-1.5">
                    <span>50%</span>
                    <span className="text-neutral-300">{minConfidence}%</span>
                    <span>95%</span>
                  </div>
                </div>
                <p className="text-[11.5px] text-[#8b949e] leading-relaxed">
                  Findings with statistical certainty below {minConfidence}% will be suppressed to eliminate false positives.
                </p>
              </div>

              {/* Card 3: Max Findings Cap */}
              <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22] space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-300">Max Findings Cap</span>
                  <span className="text-[10px] font-mono text-[#8b949e]">PR Noise Ceiling</span>
                </div>
                <div className="flex items-center justify-between h-9 bg-[#0d1117] border border-[#30363d] rounded-md px-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPreset("custom");
                      setMaxFindings((prev) => Math.max(5, prev - 5));
                    }}
                    className="w-6.5 h-6.5 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-[#21262d] transition"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs font-semibold text-white">{maxFindings} issues</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPreset("custom");
                      setMaxFindings((prev) => Math.min(100, prev + 5));
                    }}
                    className="w-6.5 h-6.5 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-[#21262d] transition"
                  >
                    +
                  </button>
                </div>
                <p className="text-[11.5px] text-[#8b949e] leading-relaxed">
                  Upper bound on posted comments to prevent review fatigue on large pull requests.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION D: REPOSITORY RULEBOOK & ARCHITECTURAL INVARIANTS */}
          <section className="space-y-4 pt-9">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-neutral-400 text-[18px]">terminal</span>
                <h3 className="text-xs font-semibold tracking-wider uppercase text-neutral-300">
                  Repository Rulebook &amp; Architectural Invariants
                </h3>
              </div>
              <p className="text-xs text-[#8b949e] mt-1">
                Markdown-formatted specifications injected directly into every AI agent prompt and orchestrator decision.
              </p>
            </div>

            {/* Quick Template Chips & View Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3.5 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[#8b949e] font-mono mr-1">Insert Rule:</span>
                {RULE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => insertTemplate(tmpl.content)}
                    className="border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] hover:border-neutral-500 text-xs px-3 py-1 rounded-full text-neutral-300 font-mono transition shadow-sm"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center rounded-lg border border-[#30363d] bg-[#0d1117] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode("write")}
                  className={`px-3 py-1 rounded font-medium shadow-xs transition ${
                    previewMode === "write"
                      ? "bg-[#21262d] text-white"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Write (Markdown)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("preview")}
                  className={`px-3 py-1 rounded font-medium shadow-xs transition ${
                    previewMode === "preview"
                      ? "bg-[#21262d] text-white"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Live Preview
                </button>
              </div>
            </div>

            {/* Markdown Studio Editor Panel */}
            <div className="rounded-xl border border-[#30363d] bg-[#090d13] overflow-hidden flex flex-col focus-within:border-neutral-400 transition-colors shadow-inner">
              {/* Formatting Toolbar */}
              <div className="px-3.5 py-2 border-b border-[#30363d] bg-[#161b22] flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => handleToolbarAction("h2")}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#21262d] font-mono font-bold text-xs w-6.5 h-6.5 flex items-center justify-center"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => handleToolbarAction("bold")}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#21262d] font-serif font-bold text-xs w-6.5 h-6.5 flex items-center justify-center"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => handleToolbarAction("italic")}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#21262d] italic font-serif text-xs w-6.5 h-6.5 flex items-center justify-center"
                >
                  I
                </button>
                <div className="w-px h-4 bg-[#30363d] mx-1"></div>
                <button
                  type="button"
                  onClick={() => handleToolbarAction("code")}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#21262d] text-xs font-mono w-6.5 h-6.5 flex items-center justify-center"
                >
                  &lt;&gt;
                </button>
                <button
                  type="button"
                  onClick={() => handleToolbarAction("codeblock")}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#21262d] text-xs font-mono w-6.5 h-6.5 flex items-center justify-center"
                >
                  {"{ }"}
                </button>
                <div className="w-px h-4 bg-[#30363d] mx-1"></div>
                <button
                  type="button"
                  onClick={() => handleToolbarAction("bullet")}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#21262d] w-6.5 h-6.5 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[15px]">format_list_bulleted</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToolbarAction("number")}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#21262d] w-6.5 h-6.5 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[15px]">format_list_numbered</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToolbarAction("check")}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#21262d] w-6.5 h-6.5 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[15px]">check_box</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToolbarAction("quote")}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#21262d] w-6.5 h-6.5 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[15px]">format_quote</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToolbarAction("table")}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#21262d] w-6.5 h-6.5 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[15px]">table</span>
                </button>
              </div>

              {/* Code/Markdown Canvas Area */}
              {previewMode === "write" ? (
                <textarea
                  ref={textareaRef}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full bg-transparent p-5 font-mono text-xs leading-relaxed text-[#c9d1d9] focus:outline-none resize-none selection:bg-[#264f78]"
                  rows={10}
                  spellCheck="false"
                  placeholder="### Security & Privacy Invariants&#10;- **No PII Logging**: Never log passwords, API tokens, user emails, or credentials.&#10;- **Tenant Scoping**: All database queries MUST explicitly include `tenant_id` filtering."
                />
              ) : (
                <div
                  className="w-full p-5 font-sans text-xs leading-relaxed text-[#c9d1d9] prose prose-invert max-w-none min-h-[190px]"
                  dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                />
              )}

              {/* Editor Footer Status */}
              <div className="px-5 py-2.5 border-t border-[#21262d] bg-[#0d1117] flex items-center justify-between text-[11px] font-mono text-neutral-500">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-neutral-400">code_blocks</span>
                  <span>Markdown formatting supported</span>
                </div>
                <div>{customPrompt.length} characters</div>
              </div>
            </div>
          </section>
        </div>

        {/* 3. MODAL STICKY FOOTER */}
        <div className="sticky bottom-0 z-20 border-t border-[#30363d] px-7 py-4.5 bg-[#161b22] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-[#8b949e]">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>Policy operational and ready to enforce on subsequent pull requests.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="border border-[#30363d] bg-transparent hover:bg-[#21262d] text-neutral-300 hover:text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-semibold px-5 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all hover:shadow"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                {saving ? "sync" : success ? "check_circle" : "check"}
              </span>
              <span>{saving ? "Saving..." : success ? "Saved!" : "Save Governance Policy"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
