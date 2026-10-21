"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, PublicConfig, ModelOption } from "@/lib/api";

const FALLBACK_MODELS: ModelOption[] = [
  {
    id: "claude-3-7-sonnet",
    name: "Anthropic Claude 3.7 Sonnet",
    provider: "anthropic",
    tag: "Recommended",
    description: "Optimal for deep architectural invariant reasoning, zero-shot AST analysis, and cross-file multi-agent debate.",
    context_window: "200k tokens",
    avg_latency: "~4.2s / PR",
    cost_per_review: "$0.041 / review",
  },
  {
    id: "gpt-6-astra",
    name: "OpenAI GPT-6 Astra",
    provider: "openai",
    tag: "Frontier",
    description: "Next-gen frontier reasoning model with native multi-step verification and autonomous test synthesis.",
    context_window: "256k tokens",
    avg_latency: "~3.8s / PR",
    cost_per_review: "$0.045 / review",
  },
  {
    id: "gpt-4o",
    name: "OpenAI GPT-4o",
    provider: "openai",
    tag: "Standard",
    description: "High-speed deterministic parser with strong structured JSON formatting and high throughput for small diffs.",
    context_window: "128k tokens",
    avg_latency: "~3.5s / PR",
    cost_per_review: "$0.038 / review",
  },
  {
    id: "deepseek-coder",
    name: "DeepSeek Coder V2 / Reasoner",
    provider: "deepseek",
    tag: "Self-Hosted",
    description: "Zero data egress, running on local air-gapped GPU clusters. Meets strict tier-1 sovereign data residency.",
    context_window: "64k tokens",
    avg_latency: "~2.1s / PR",
    cost_per_review: "$0.000 / egress",
  },
];

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"general" | "ai" | "rules" | "webhooks" | "economics">(
    tabParam === "rules" || tabParam === "fallback"
      ? "rules"
      : tabParam === "ai"
      ? "ai"
      : tabParam === "webhooks"
      ? "webhooks"
      : tabParam === "economics"
      ? "economics"
      : "general"
  );

  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("claude-3-7-sonnet");
  const [secondaryFallback, setSecondaryFallback] = useState(true);
  const [temperature, setTemperature] = useState(0.1);
  const [maxFiles, setMaxFiles] = useState(500);
  const [confidenceFloor, setConfidenceFloor] = useState(75);
  const [maxFindings, setMaxFindings] = useState(25);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tabParam === "rules" || tabParam === "fallback") {
      setActiveTab("rules");
    } else if (tabParam === "general") {
      setActiveTab("general");
    } else if (tabParam === "ai") {
      setActiveTab("ai");
    } else if (tabParam === "webhooks") {
      setActiveTab("webhooks");
    } else if (tabParam === "economics") {
      setActiveTab("economics");
    }
  }, [tabParam]);

  useEffect(() => {
    api
      .getPublicConfig()
      .then((cfg) => {
        setPublicConfig(cfg);
        if (cfg.selected_model) {
          setSelectedModel(cfg.selected_model);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch public config from backend:", err);
      });
  }, []);

  const handleSelectModel = async (modelId: string) => {
    setSelectedModel(modelId);
    try {
      await api.updateGlobalModel(modelId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to update model:", err);
    }
  };

  const handleCopyUrl = () => {
    const url = publicConfig?.webhook_url || "https://api.codesentinel.io/api/webhook/github";
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedModel) {
        await api.updateGlobalModel(selectedModel);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const availableModels = publicConfig?.available_models?.length
    ? publicConfig.available_models
    : FALLBACK_MODELS;

  const appSlug = publicConfig?.github_app_slug || "code-sentinel-app";
  const appId = publicConfig?.github_app_id || 849202;
  const webhookUrl = publicConfig?.webhook_url || "https://api.codesentinel.io/api/webhook/github";
  const isHmacEnforced = publicConfig ? publicConfig.webhook_secret_configured : true;

  return (
    <div className="flex flex-col w-full pb-16 text-[#c9d1d9] antialiased">
      {/* Breadcrumbs & Page Header Section */}
      <div className="flex flex-col gap-2.5 pt-4 pb-6 border-b border-[#30363d]/60 mb-8">
        <nav className="flex items-center gap-2 text-[11px] text-[#8b949e] font-mono">
          <Link className="hover:text-[#f0f6fc] transition-colors" href="/dashboard">
            Dashboard
          </Link>
          <span className="text-[#484f58]">/</span>
          <span className="text-[#58a6ff] font-medium">
            {activeTab === "rules" ? "Architectural Rules" : "Organization Settings"}
          </span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-1">
          <div>
            <h1 className="text-[28px] font-semibold text-[#f0f6fc] tracking-tight flex items-center gap-3 font-display">
              <span>
                {activeTab === "rules"
                  ? "Architectural Invariants & Fallback Policy"
                  : "Organization & Global Inspection Settings"}
              </span>
              <span className="font-mono text-[11px] font-normal px-2.5 py-0.5 rounded-full bg-[#161b22] text-[#8b949e] border border-[#30363d]">
                TENANT: 0x93FA-ENTERPRISE
              </span>
            </h1>
            <p className="text-[13px] text-[#8b949e] mt-1.5 max-w-2xl leading-relaxed">
              {activeTab === "rules"
                ? "Define compliance baselines, memory leak checks, concurrency rules, and payload caps enforced across repositories."
                : "Configure GitHub App credentials, frontier LiteLLM inference engines, webhook secrets, and token governance."}
            </p>
          </div>
          {/* Top Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`https://github.com/apps/${appSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3.5 rounded-md border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-[12px] font-medium text-[#c9d1d9] hover:text-[#f0f6fc] flex items-center gap-2 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              <span>GitHub App</span>
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-4 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-[12px] font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                {saved ? "check_circle" : saving ? "progress_activity" : "check"}
              </span>
              <span>{saved ? "Changes Saved!" : saving ? "Saving..." : "Save Global Changes"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Tab Navigation Rail */}
      <div className="border-b border-[#30363d]/60 flex items-center gap-8 text-[13px] font-medium overflow-x-auto mb-8">
        <button
          onClick={() => setActiveTab("general")}
          className={`py-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            activeTab === "general"
              ? "text-[#58a6ff] font-semibold border-[#58a6ff]"
              : "text-[#8b949e] hover:text-[#f0f6fc] border-transparent"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">deployed_code</span>
          <span>General &amp; GitHub App</span>
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`py-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            activeTab === "ai"
              ? "text-[#58a6ff] font-semibold border-[#58a6ff]"
              : "text-[#8b949e] hover:text-[#f0f6fc] border-transparent"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">psychology</span>
          <span>AI Inference Engine</span>
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`py-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            activeTab === "rules"
              ? "text-[#58a6ff] font-semibold border-[#58a6ff]"
              : "text-[#8b949e] hover:text-[#f0f6fc] border-transparent"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">rule</span>
          <span>Architectural Rules &amp; Fallback</span>
        </button>
        <button
          onClick={() => setActiveTab("webhooks")}
          className={`py-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            activeTab === "webhooks"
              ? "text-[#58a6ff] font-semibold border-[#58a6ff]"
              : "text-[#8b949e] hover:text-[#f0f6fc] border-transparent"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">key</span>
          <span>Webhooks &amp; HMAC Security</span>
        </button>
        <button
          onClick={() => setActiveTab("economics")}
          className={`py-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            activeTab === "economics"
              ? "text-[#58a6ff] font-semibold border-[#58a6ff]"
              : "text-[#8b949e] hover:text-[#f0f6fc] border-transparent"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">savings</span>
          <span>Token Economics</span>
        </button>
      </div>

      <div className="space-y-8">
        {/* SECTION 1: GITHUB APP INSTALLATION & SYNCHRONIZATION */}
        {(activeTab === "general") && (
          <section className="bg-[#161b22] rounded-xl border border-[#30363d] p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#30363d]/60 gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#0d1117] flex items-center justify-center text-[#f0f6fc] border border-[#30363d]">
                  <span className="material-symbols-outlined text-2xl">integration_instructions</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-semibold text-[#f0f6fc]">CodeSentinel Engine</h2>
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#0d1117] text-[#8b949e] border border-[#30363d]">
                      App ID: {appId}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Active Installation
                    </span>
                  </div>
                  <p className="text-[12px] text-[#8b949e] mt-0.5">
                    Connected GitHub App slug: <span className="font-mono text-[#58a6ff]">{appSlug}</span> with organization-level webhook listeners.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://github.com/apps/${appSlug}/installations/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-7 px-3 text-[11px] font-medium text-[#c9d1d9] hover:text-[#58a6ff] bg-[#21262d] hover:bg-[#30363d] rounded border border-[#30363d] flex items-center gap-1.5 transition-colors"
                >
                  <span>Install on GitHub</span>
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </a>
              </div>
            </div>

            {/* Scope & Permissions Chips */}
            <div>
              <span className="font-mono text-[10px] uppercase font-semibold text-[#8b949e] tracking-wider">
                Active Permissions &amp; OAuth Scopes
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]">
                  <span className="material-symbols-outlined text-[14px] text-emerald-400">check_circle</span>
                  Read/Write Pull Requests
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]">
                  <span className="material-symbols-outlined text-[14px] text-emerald-400">check_circle</span>
                  Read Repository Contents
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]">
                  <span className="material-symbols-outlined text-[14px] text-emerald-400">check_circle</span>
                  Read/Write Issues &amp; Checks
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]">
                  <span className="material-symbols-outlined text-[14px] text-[#58a6ff]">lock</span>
                  Single Sign-On (GitHub OAuth)
                </span>
              </div>
            </div>

            {/* Sync Mode Callout */}
            <div className="bg-[#0d1117] rounded-lg p-3 border border-[#30363d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#58a6ff] text-xl">sync_alt</span>
                <div>
                  <span className="text-[12px] font-semibold text-[#f0f6fc] block">Automatic Webhook Ingestion</span>
                  <span className="text-[11px] text-[#8b949e] font-mono">
                    Subscribed events: pull_request.opened, pull_request.synchronize, check_run.rerequested
                  </span>
                </div>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
          </section>
        )}

        {/* SECTION 2: AI INFERENCE ENGINE & REASONING TIER */}
        {(activeTab === "ai") && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#f0f6fc] font-display">
                  Primary Inference Engine &amp; Reasoning Tier
                </h2>
                <p className="text-[12px] text-[#8b949e] mt-0.5">
                  Select the orchestration LLM responsible for multi-agent synthesis, invariant checking, and code patch generation. Standardized via LiteLLM.
                </p>
              </div>
              <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                Active: {selectedModel}
              </span>
            </div>

            {/* Bento Grid for Frontier Model Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {availableModels.map((model) => {
                const isSelected = selectedModel === model.id;

                return (
                  <div
                    key={model.id}
                    onClick={() => handleSelectModel(model.id)}
                    className={`rounded-xl p-5 flex flex-col justify-between relative shadow-sm cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#1b222c] border-2 border-[#58a6ff]"
                        : "bg-[#161b22] border border-[#30363d] hover:border-[#8b949e]"
                    }`}
                  >
                    {model.tag && (
                      <div className="absolute -top-3 right-4 bg-[#58a6ff] text-black text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        {model.tag}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            isSelected ? "bg-[#58a6ff] text-black" : "border border-[#30363d]"
                          }`}
                        >
                          {isSelected && (
                            <span className="material-symbols-outlined text-[11px]">check</span>
                          )}
                        </span>
                        <h3 className="text-[14px] font-bold text-[#f0f6fc] leading-tight">{model.name}</h3>
                      </div>
                      <p className="text-[12px] text-[#8b949e] leading-relaxed mb-4">
                        {model.description}
                      </p>
                    </div>
                    <div className="pt-3.5 border-t border-[#30363d]/60 space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between text-[#8b949e]">
                        <span>Context:</span>
                        <span className="text-[#f0f6fc] font-semibold">{model.context_window}</span>
                      </div>
                      <div className="flex justify-between text-[#8b949e]">
                        <span>Latency:</span>
                        <span className="text-emerald-400 font-semibold">{model.avg_latency}</span>
                      </div>
                      <div className="flex justify-between text-[#8b949e]">
                        <span>Est. Cost:</span>
                        <span className="text-[#f0f6fc] font-semibold">{model.cost_per_review}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sampling & Fallback Controls */}
            <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
              <div className="flex items-center gap-3">
                <input
                  id="fallback-check"
                  type="checkbox"
                  checked={secondaryFallback}
                  onChange={(e) => setSecondaryFallback(e.target.checked)}
                  className="rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="fallback-check" className="text-[12px] text-[#f0f6fc] cursor-pointer">
                  <span className="font-semibold">Automatic Secondary Fallback:</span>{" "}
                  <span className="text-[#8b949e]">
                    Switch to GPT-4o if primary frontier model encounters upstream rate limiting (HTTP 429).
                  </span>
                </label>
              </div>
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <div className="flex flex-col text-right font-mono">
                  <span className="text-[11px] font-semibold text-[#f0f6fc]">Sampling Temperature: {temperature}</span>
                  <span className="text-[10px] text-[#8b949e]">Minimizes hallucinated invariant triggers</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-32 h-1.5 bg-[#0d1117] rounded-lg appearance-none cursor-pointer accent-[#58a6ff]"
                />
              </div>
            </div>
          </section>
        )}

        {/* SECTION 3: ARCHITECTURAL RULES & DEFAULT GOVERNANCE FALLBACK */}
        {(activeTab === "rules") && (
          <section className="space-y-4">
            <div>
              <h2 className="text-[16px] font-semibold text-[#f0f6fc] font-display">
                Architectural Invariants &amp; Governance Fallback
              </h2>
              <p className="text-[12px] text-[#8b949e] mt-0.5">
                Baseline thresholds and compliance invariants applied when a repository lacks a dedicated repository rulebook.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Max Files */}
              <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-[#f0f6fc] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#8b949e] text-[17px]">file_copy</span>
                    Global Max Files per PR
                  </span>
                  <span className="material-symbols-outlined text-[#8b949e] text-[15px]">info</span>
                </div>
                <p className="text-[11.5px] text-[#8b949e] leading-relaxed">Maximum changed files evaluated before failing with payload overrun.</p>
                <div className="flex items-center gap-2.5 pt-1 font-mono">
                  <input
                    type="number"
                    value={maxFiles}
                    onChange={(e) => setMaxFiles(Number(e.target.value))}
                    className="text-[12px] font-semibold w-24 h-9 bg-[#0d1117] border border-[#30363d] rounded px-3 text-[#f0f6fc] focus:outline-none"
                  />
                  <span className="text-[11px] text-[#8b949e]">files ceiling</span>
                </div>
              </div>

              {/* Card 2: Confidence Cutoff */}
              <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-[#f0f6fc] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#8b949e] text-[17px]">speed</span>
                    Default Confidence Floor
                  </span>
                  <span className="font-mono text-[12px] font-bold text-emerald-400">{confidenceFloor}%</span>
                </div>
                <p className="text-[11.5px] text-[#8b949e] leading-relaxed">Findings below this probability score are suppressed from the PR inline view.</p>
                <div className="pt-2">
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={confidenceFloor}
                    onChange={(e) => setConfidenceFloor(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#0d1117] rounded-lg appearance-none cursor-pointer accent-[#58a6ff]"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-[#8b949e] mt-1.5">
                    <span>50% (Permissive)</span>
                    <span>95% (Strict)</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Max Comments */}
              <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-[#f0f6fc] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#8b949e] text-[17px]">speaker_notes_off</span>
                    Max Output Findings Cap
                  </span>
                  <span className="material-symbols-outlined text-[#8b949e] text-[15px]">info</span>
                </div>
                <p className="text-[11.5px] text-[#8b949e] leading-relaxed">Prevents review fatigue by capping top findings posted to GitHub PR.</p>
                <div className="flex items-center gap-2.5 pt-1 font-mono">
                  <input
                    type="number"
                    value={maxFindings}
                    onChange={(e) => setMaxFindings(Number(e.target.value))}
                    className="text-[12px] font-semibold w-24 h-9 bg-[#0d1117] border border-[#30363d] rounded px-3 text-[#f0f6fc] focus:outline-none"
                  />
                  <span className="text-[11px] text-[#8b949e]">comments max</span>
                </div>
              </div>
            </div>

            {/* Active Invariants Policy Card */}
            <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 space-y-3 shadow-sm">
              <span className="text-[12.5px] font-semibold text-[#f0f6fc] block">Standard Architectural Invariant Enforcement</span>
              <p className="text-[12px] text-[#8b949e]">
                CodeSentinel automatically intercepts: raw unchecked SQL statements, unhandled asynchronous promises, missing tenant isolations, and exposed API credentials across all active reviews.
              </p>
            </div>
          </section>
        )}

        {/* SECTION 4: WEBHOOK SECURITY & HMAC INVARIANT VERIFICATION */}
        {(activeTab === "webhooks") && (
          <section className="bg-[#161b22] rounded-xl border border-[#30363d] p-6 space-y-5 shadow-sm">
            <div>
              <h2 className="text-[16px] font-semibold text-[#f0f6fc] font-display">
                Webhook Security &amp; HMAC Invariant Verification
              </h2>
              <p className="text-[12px] text-[#8b949e] mt-0.5">
                Cryptographic verification guarantees incoming GitHub webhook payloads originate solely from authorized enterprise GitHub endpoints.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Webhook URL Field */}
              <div className="space-y-2">
                <label className="font-mono text-[11px] font-semibold text-[#8b949e] uppercase">
                  GitHub Webhook Payload URL
                </label>
                <div className="relative flex">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="font-mono text-[12px] bg-[#0d1117] text-[#f0f6fc] border border-[#30363d] rounded-l-md px-3.5 py-2.5 w-full select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="h-auto px-3.5 bg-[#21262d] hover:bg-[#30363d] border-y border-r border-[#30363d] rounded-r-md text-[12px] font-medium text-[#c9d1d9] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copiedUrl ? "check" : "content_copy"}
                    </span>
                    <span>{copiedUrl ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#8b949e]">Configure this endpoint in your GitHub App settings under Webhooks.</p>
              </div>

              {/* HMAC Verification Status Card */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-[11px] font-semibold text-[#8b949e] uppercase">
                    HMAC Invariant Verification (SHA-256)
                  </label>
                  <span className={`text-[10px] font-mono ${isHmacEnforced ? "text-emerald-400" : "text-amber-400"}`}>
                    {isHmacEnforced ? "Enforced & Active" : "Permissive Mode"}
                  </span>
                </div>
                <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-md flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${isHmacEnforced ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="font-mono text-[#c9d1d9]">
                      {isHmacEnforced
                        ? "GITHUB_WEBHOOK_SECRET loaded from backend .env"
                        : "GITHUB_WEBHOOK_SECRET not set (Dev Permissive Mode)"}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#161b22] text-[#8b949e] border border-[#30363d]">
                    RFC-2104
                  </span>
                </div>
                <p className="text-[11px] text-[#8b949e]">
                  Incoming requests require X-Hub-Signature-256 validation. No manual code needed.
                </p>
              </div>
            </div>

            {/* Health Status Banner */}
            <div className="bg-[#0d1117] rounded-xl p-3.5 border border-[#30363d] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span className="font-semibold text-[#f0f6fc]">Operational &amp; Invariant Protected</span>
                <span className="text-[#484f58]">•</span>
                <span className="font-mono text-[#8b949e]">
                  Endpoint /api/webhook/github is active and listening for pull_request events.
                </span>
              </div>
              <Link href="/dashboard/reviews" className="font-mono text-[11px] text-[#58a6ff] hover:underline font-semibold flex items-center gap-1.5">
                <span>View PR Feed</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </section>
        )}

        {/* SECTION 5: TOKEN ECONOMICS & BUDGET SAFEGUARDS */}
        {(activeTab === "economics") && (
          <section className="bg-[#161b22] rounded-xl border border-[#30363d] p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[#f0f6fc] font-display">
                  Token Economics &amp; Monthly Budget Safeguards
                </h2>
                <p className="text-[12px] text-[#8b949e] mt-0.5">
                  Protect against runaway review loops and automated cascade generation costs via LiteLLM token cost calculation.
                </p>
              </div>
              <span className="font-mono text-[11px] text-emerald-400 font-semibold bg-[#0d1117] px-3 py-1 rounded-md border border-[#30363d]">
                Burn Rate: $4.85 / week projected
              </span>
            </div>

            {/* Progress Bar & Spend Breakdown */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#f0f6fc] font-semibold">$18.42 used (12.3%)</span>
                <span className="text-[#8b949e]">Monthly Hard Cap: $150.00 USD</span>
              </div>
              <div className="w-full h-3 bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d]">
                <div className="bg-emerald-400 h-full rounded-full transition-all duration-300" style={{ width: "12.3%" }}></div>
              </div>
              <div className="flex justify-between text-[11px] text-[#8b949e] font-mono">
                <span>Cycle resets in 19 days</span>
                <span>Allocated: 3,650 PR inspections</span>
              </div>
            </div>

            {/* Safeguards Toggles */}
            <div className="pt-4 border-t border-[#30363d]/60 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start justify-between p-4 rounded-xl bg-[#0d1117] border border-[#30363d]">
                <div>
                  <span className="text-[12.5px] font-semibold text-[#f0f6fc] block">Hard Cap Execution Brake</span>
                  <span className="text-[11.5px] text-[#8b949e] mt-0.5 block">Pause automated reviews if monthly spend reaches 100% ($150.00).</span>
                </div>
                <div className="w-8 h-4.5 bg-neutral-300 rounded-full relative cursor-pointer ml-3.5 shrink-0">
                  <span className="absolute top-[2px] right-[2px] bg-white rounded-full h-3.5 w-3.5 shadow-sm"></span>
                </div>
              </div>

              <div className="flex items-start justify-between p-4 rounded-xl bg-[#0d1117] border border-[#30363d]">
                <div>
                  <span className="text-[12.5px] font-semibold text-[#f0f6fc] block">Slack &amp; PagerDuty Alert Trigger</span>
                  <span className="text-[11.5px] text-[#8b949e] mt-0.5 block">
                    Dispatch priority warning webhooks when monthly consumption exceeds 80% ($120.00).
                  </span>
                </div>
                <div className="w-8 h-4.5 bg-neutral-300 rounded-full relative cursor-pointer ml-3.5 shrink-0">
                  <span className="absolute top-[2px] right-[2px] bg-white rounded-full h-3.5 w-3.5 shadow-sm"></span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[#8b949e] font-mono text-xs">Loading settings...</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
