"use client";

import { useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "ai" | "fallback" | "webhooks" | "team">("general");
  const [selectedModel, setSelectedModel] = useState<"claude" | "gpt4o" | "deepseek">("claude");
  const [secondaryFallback, setSecondaryFallback] = useState(true);
  const [temperature, setTemperature] = useState(0.1);
  const [maxFiles, setMaxFiles] = useState(500);
  const [confidenceFloor, setConfidenceFloor] = useState(75);
  const [maxFindings, setMaxFindings] = useState(25);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText("https://api.codesentinel.io/api/webhook/github");
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col w-full pb-16 text-[#c9d1d9] antialiased">
      {/* Breadcrumbs & Page Header Section */}
      <div className="flex flex-col gap-2 pt-2 pb-5 border-b border-[#30363d]/60 mb-6">
        <nav className="flex items-center gap-1.5 text-[11px] text-[#8b949e] font-mono">
          <Link className="hover:text-[#f0f6fc] transition-colors" href="/dashboard">
            Dashboard
          </Link>
          <span className="text-[#484f58]">/</span>
          <span className="text-[#58a6ff] font-medium">Organization Settings</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-[24px] font-semibold text-[#f0f6fc] tracking-tight flex items-center gap-2.5 font-display">
              <span>Organization &amp; Global Inspection Settings</span>
              <span className="font-mono text-[11px] font-normal px-2 py-0.5 rounded-full bg-[#161b22] text-[#8b949e] border border-[#30363d]">
                TENANT: 0x93FA-FINTECH
              </span>
            </h1>
            <p className="text-[13px] text-[#8b949e] mt-1 max-w-2xl leading-relaxed">
              Configure GitHub App credentials, global AI inference models, webhook secrets, and default fallback policies across 142 enterprise repositories.
            </p>
          </div>
          {/* Top Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://github.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 rounded-md border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-[12px] font-medium text-[#c9d1d9] hover:text-[#f0f6fc] flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              <span>Documentation</span>
            </a>
            <button
              onClick={handleSave}
              className="h-8 px-3.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-[12px] font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">
                {saved ? "check_circle" : "check"}
              </span>
              <span>{saved ? "Changes Saved!" : "Save Global Changes"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Tab Navigation Rail */}
      <div className="border-b border-[#30363d]/60 flex items-center gap-6 text-[12px] font-medium overflow-x-auto mb-6">
        <button
          onClick={() => setActiveTab("general")}
          className={`py-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "general"
              ? "text-[#58a6ff] font-semibold border-[#58a6ff]"
              : "text-[#8b949e] hover:text-[#f0f6fc] border-transparent"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">deployed_code</span>
          <span>General &amp; GitHub App</span>
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`py-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "ai"
              ? "text-[#58a6ff] font-semibold border-[#58a6ff]"
              : "text-[#8b949e] hover:text-[#f0f6fc] border-transparent"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">psychology</span>
          <span>AI Inference Engine</span>
        </button>
        <button
          onClick={() => setActiveTab("fallback")}
          className={`py-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "fallback"
              ? "text-[#58a6ff] font-semibold border-[#58a6ff]"
              : "text-[#8b949e] hover:text-[#f0f6fc] border-transparent"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">rule</span>
          <span>Fallback Review Policy</span>
        </button>
        <button
          onClick={() => setActiveTab("webhooks")}
          className={`py-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "webhooks"
              ? "text-[#58a6ff] font-semibold border-[#58a6ff]"
              : "text-[#8b949e] hover:text-[#f0f6fc] border-transparent"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">key</span>
          <span>Webhooks &amp; Secrets</span>
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`py-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "team"
              ? "text-[#58a6ff] font-semibold border-[#58a6ff]"
              : "text-[#8b949e] hover:text-[#f0f6fc] border-transparent"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">badge</span>
          <span>Team Access &amp; Audit</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* SECTION 1: GITHUB APP INSTALLATION & SYNCHRONIZATION */}
        <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#30363d]/60 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0d1117] flex items-center justify-center text-[#f0f6fc] border border-[#30363d]">
                <span className="material-symbols-outlined text-2xl">integration_instructions</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold text-[#f0f6fc]">Acme Global FinTech</h2>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#0d1117] text-[#8b949e] border border-[#30363d]">
                    App ID: 849202
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Active Installation
                  </span>
                </div>
                <p className="text-[12px] text-[#8b949e] mt-0.5">
                  Connected to GitHub Enterprise Cloud with organization-level webhook listeners.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-7 px-2.5 text-[11px] font-medium text-[#c9d1d9] hover:text-[#f0f6fc] bg-[#21262d] hover:bg-[#30363d] rounded border border-[#30363d] flex items-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                <span>Re-authenticate</span>
              </button>
              <a
                href="https://github.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 px-3 text-[11px] font-medium text-[#c9d1d9] hover:text-[#58a6ff] bg-[#21262d] hover:bg-[#30363d] rounded border border-[#30363d] flex items-center gap-1.5 transition-colors"
              >
                <span>Manage on GitHub</span>
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
                Single Sign-On (SAML/OIDC)
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
            {/* Toggle */}
            <div className="w-8 h-4.5 bg-neutral-300 rounded-full relative cursor-pointer">
              <span className="absolute top-[2px] right-[2px] bg-white rounded-full h-3.5 w-3.5 shadow-sm"></span>
            </div>
          </div>
        </section>

        {/* SECTION 2: AI INFERENCE ENGINE & REASONING TIER */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#f0f6fc] font-display">
                Primary Inference Engine &amp; Reasoning Tier
              </h2>
              <p className="text-[12px] text-[#8b949e]">
                Select the orchestration LLM responsible for multi-agent synthesis, invariant checking, and code patch generation.
              </p>
            </div>
            <span className="font-mono text-[11px] text-[#8b949e]">Model Runtime: Enforced v2 API</span>
          </div>

          {/* 3-Column Bento Grid for Model Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card A: Claude 3.5 Sonnet */}
            <div
              onClick={() => setSelectedModel("claude")}
              className={`rounded-lg p-4 flex flex-col justify-between relative shadow-sm cursor-pointer transition-all ${
                selectedModel === "claude"
                  ? "bg-[#1b222c] border-2 border-[#58a6ff]"
                  : "bg-[#161b22] border border-[#30363d] hover:border-[#8b949e]"
              }`}
            >
              <div className="absolute -top-2.5 right-3 bg-[#58a6ff] text-black text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">verified</span>
                Recommended
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#58a6ff] flex items-center justify-center text-black">
                    <span className="material-symbols-outlined text-[10px]">check</span>
                  </span>
                  <h3 className="text-[14px] font-bold text-[#f0f6fc]">Anthropic Claude 3.5 Sonnet</h3>
                </div>
                <p className="text-[12px] text-[#8b949e] leading-relaxed mb-3">
                  Optimal for deep architectural invariant reasoning, zero-shot AST analysis, and cross-file multi-agent debate.
                </p>
              </div>
              <div className="pt-3 border-t border-[#30363d]/60 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-[#8b949e]">
                  <span>Context Window:</span>
                  <span className="text-[#f0f6fc] font-semibold">200k tokens</span>
                </div>
                <div className="flex justify-between text-[#8b949e]">
                  <span>Avg Latency:</span>
                  <span className="text-emerald-400 font-semibold">~4.2s / PR</span>
                </div>
                <div className="flex justify-between text-[#8b949e]">
                  <span>Est. Cost:</span>
                  <span className="text-[#f0f6fc] font-semibold">$0.041 / review</span>
                </div>
              </div>
            </div>

            {/* Card B: GPT-4o */}
            <div
              onClick={() => setSelectedModel("gpt4o")}
              className={`rounded-lg p-4 flex flex-col justify-between cursor-pointer transition-all ${
                selectedModel === "gpt4o"
                  ? "bg-[#1b222c] border-2 border-[#58a6ff]"
                  : "bg-[#161b22] border border-[#30363d] hover:border-[#8b949e]"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3.5 h-3.5 rounded-full border border-[#30363d]"></span>
                  <h3 className="text-[14px] font-semibold text-[#f0f6fc]">OpenAI GPT-4o</h3>
                </div>
                <p className="text-[12px] text-[#8b949e] leading-relaxed mb-3">
                  High-speed deterministic parser with strong structured JSON formatting and high throughput for small diffs.
                </p>
              </div>
              <div className="pt-3 border-t border-[#30363d]/60 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-[#8b949e]">
                  <span>Context Window:</span>
                  <span className="text-[#f0f6fc] font-semibold">128k tokens</span>
                </div>
                <div className="flex justify-between text-[#8b949e]">
                  <span>Avg Latency:</span>
                  <span className="text-emerald-400 font-semibold">~3.5s / PR</span>
                </div>
                <div className="flex justify-between text-[#8b949e]">
                  <span>Est. Cost:</span>
                  <span className="text-[#f0f6fc] font-semibold">$0.038 / review</span>
                </div>
              </div>
            </div>

            {/* Card C: DeepSeek Coder V2 */}
            <div
              onClick={() => setSelectedModel("deepseek")}
              className={`rounded-lg p-4 flex flex-col justify-between cursor-pointer transition-all ${
                selectedModel === "deepseek"
                  ? "bg-[#1b222c] border-2 border-[#58a6ff]"
                  : "bg-[#161b22] border border-[#30363d] hover:border-[#8b949e]"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3.5 h-3.5 rounded-full border border-[#30363d]"></span>
                  <h3 className="text-[14px] font-semibold text-[#f0f6fc]">DeepSeek Coder V2</h3>
                  <span className="font-mono text-[9px] px-1 rounded bg-[#0d1117] text-[#8b949e] border border-[#30363d]">
                    Self-Hosted
                  </span>
                </div>
                <p className="text-[12px] text-[#8b949e] leading-relaxed mb-3">
                  Zero data egress, running on local air-gapped GPU clusters. Meets strict tier-1 sovereign data residency.
                </p>
              </div>
              <div className="pt-3 border-t border-[#30363d]/60 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-[#8b949e]">
                  <span>Context Window:</span>
                  <span className="text-[#f0f6fc] font-semibold">64k tokens</span>
                </div>
                <div className="flex justify-between text-[#8b949e]">
                  <span>Avg Latency:</span>
                  <span className="text-emerald-400 font-semibold">~2.1s / PR</span>
                </div>
                <div className="flex justify-between text-[#8b949e]">
                  <span>Est. Cost:</span>
                  <span className="text-emerald-400 font-semibold">$0.000 / egress</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Controls Row */}
          <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <input
                id="fallback-check"
                type="checkbox"
                checked={secondaryFallback}
                onChange={(e) => setSecondaryFallback(e.target.checked)}
                className="rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="fallback-check" className="text-[12px] text-[#f0f6fc] cursor-pointer">
                <span className="font-semibold">Automatic Secondary Fallback:</span>{" "}
                <span className="text-[#8b949e]">Switch to GPT-4o if primary encounters upstream rate limiting (HTTP 429).</span>
              </label>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
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

        {/* SECTION 3: DEFAULT REVIEW FALLBACK PARAMETERS */}
        <section className="space-y-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#f0f6fc] font-display">
              Default Governance Fallback Parameters
            </h2>
            <p className="text-[12px] text-[#8b949e]">
              Baseline thresholds applied when a repository lacks a dedicated Repository Governance Policy file.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Max Files */}
            <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#f0f6fc] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#8b949e] text-[16px]">file_copy</span>
                  Global Max Files per PR
                </span>
                <span className="material-symbols-outlined text-[#8b949e] text-[14px]">info</span>
              </div>
              <p className="text-[11px] text-[#8b949e]">Maximum changed files evaluated before failing with payload overrun.</p>
              <div className="flex items-center gap-2 pt-1 font-mono">
                <input
                  type="number"
                  value={maxFiles}
                  onChange={(e) => setMaxFiles(Number(e.target.value))}
                  className="text-[12px] font-semibold w-24 h-8 bg-[#0d1117] border border-[#30363d] rounded px-2.5 text-[#f0f6fc] focus:outline-none"
                />
                <span className="text-[11px] text-[#8b949e]">files ceiling</span>
              </div>
            </div>

            {/* Card 2: Confidence Cutoff */}
            <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#f0f6fc] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#8b949e] text-[16px]">speed</span>
                  Default Confidence Floor
                </span>
                <span className="font-mono text-[12px] font-bold text-emerald-400">{confidenceFloor}%</span>
              </div>
              <p className="text-[11px] text-[#8b949e]">Findings below this probability score are suppressed from the PR inline view.</p>
              <div className="pt-2">
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={confidenceFloor}
                  onChange={(e) => setConfidenceFloor(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#0d1117] rounded-lg appearance-none cursor-pointer accent-[#58a6ff]"
                />
                <div className="flex justify-between font-mono text-[10px] text-[#8b949e] mt-1">
                  <span>50% (Permissive)</span>
                  <span>95% (Strict)</span>
                </div>
              </div>
            </div>

            {/* Card 3: Max Comments */}
            <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#f0f6fc] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#8b949e] text-[16px]">speaker_notes_off</span>
                  Max Output Findings Cap
                </span>
                <span className="material-symbols-outlined text-[#8b949e] text-[14px]">info</span>
              </div>
              <p className="text-[11px] text-[#8b949e]">Prevents review fatigue by capping top findings posted to GitHub PR.</p>
              <div className="flex items-center gap-2 pt-1 font-mono">
                <input
                  type="number"
                  value={maxFindings}
                  onChange={(e) => setMaxFindings(Number(e.target.value))}
                  className="text-[12px] font-semibold w-24 h-8 bg-[#0d1117] border border-[#30363d] rounded px-2.5 text-[#f0f6fc] focus:outline-none"
                />
                <span className="text-[11px] text-[#8b949e]">comments max</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: WEBHOOK SECURITY & HMAC INVARIANT VERIFICATION */}
        <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-5 space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[#f0f6fc] font-display">
              Webhook Security &amp; HMAC Invariant Verification
            </h2>
            <p className="text-[12px] text-[#8b949e]">
              Cryptographic verification guarantees incoming GitHub events originate solely from authorized enterprise endpoints.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Webhook URL Field */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] font-semibold text-[#8b949e] uppercase">
                GitHub Webhook Payload URL
              </label>
              <div className="relative flex">
                <input
                  type="text"
                  readOnly
                  value="https://api.codesentinel.io/api/webhook/github"
                  className="font-mono text-[12px] bg-[#0d1117] text-[#f0f6fc] border border-[#30363d] rounded-l px-3 py-2 w-full select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyUrl}
                  className="h-auto px-3 bg-[#21262d] hover:bg-[#30363d] border-y border-r border-[#30363d] rounded-r text-[12px] font-medium text-[#c9d1d9] flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {copiedUrl ? "check" : "content_copy"}
                  </span>
                  <span>{copiedUrl ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* HMAC Secret Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-mono text-[11px] font-semibold text-[#8b949e] uppercase">
                  HMAC Secret Token (SHA-256)
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">Last Rotated: 14d ago</span>
              </div>
              <div className="relative flex">
                <input
                  type={showSecret ? "text" : "password"}
                  readOnly
                  value="cs_sec_live_948f93284091a100234b09"
                  className="font-mono text-[12px] bg-[#0d1117] text-[#f0f6fc] border border-[#30363d] rounded-l px-3 py-2 w-full focus:outline-none"
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="h-auto px-2.5 bg-[#21262d] hover:bg-[#30363d] border-y border-r border-[#30363d] text-[12px] text-[#c9d1d9] flex items-center transition-colors"
                  title="Reveal Secret"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {showSecret ? "visibility_off" : "visibility"}
                  </span>
                </button>
                <button
                  onClick={() => alert("Secret rotation initiated.")}
                  className="h-auto px-3 bg-[#21262d] hover:bg-[#30363d] border-y border-r border-[#30363d] rounded-r text-[12px] font-medium text-red-400 flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                  <span>Rotate Secret</span>
                </button>
              </div>
            </div>
          </div>

          {/* Health Status Banner */}
          <div className="bg-[#0d1117] rounded-lg p-3 border border-[#30363d] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
              <span className="font-semibold text-[#f0f6fc]">Operational</span>
              <span className="text-[#484f58]">•</span>
              <span className="font-mono text-[#8b949e]">
                Last ping 2m ago (HTTP 200 OK • 18ms latency • SHA-256 Verified)
              </span>
            </div>
            <button className="font-mono text-[11px] text-[#58a6ff] hover:underline font-semibold flex items-center gap-1">
              <span>Inspect Delivery Log</span>
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </button>
          </div>
        </section>

        {/* SECTION 5: TOKEN ECONOMICS & BUDGET SAFEGUARDS */}
        <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-[#f0f6fc] font-display">
                Token Economics &amp; Monthly Budget Safeguards
              </h2>
              <p className="text-[12px] text-[#8b949e]">
                Protect against runaway review loops and automated cascade generation costs.
              </p>
            </div>
            <span className="font-mono text-[11px] text-emerald-400 font-semibold bg-[#0d1117] px-2.5 py-1 rounded border border-[#30363d]">
              Burn Rate: $4.85 / week projected
            </span>
          </div>

          {/* Progress Bar & Spend Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-[#f0f6fc] font-semibold">$18.42 used (12.3%)</span>
              <span className="text-[#8b949e]">Monthly Hard Cap: $150.00 USD</span>
            </div>
            <div className="w-full h-2.5 bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d]">
              <div className="bg-emerald-400 h-full rounded-full transition-all duration-300" style={{ width: "12.3%" }}></div>
            </div>
            <div className="flex justify-between text-[11px] text-[#8b949e] font-mono">
              <span>Cycle resets in 19 days (Oct 1)</span>
              <span>Allocated: 3,650 PR inspections</span>
            </div>
          </div>

          {/* Safeguards Toggles */}
          <div className="pt-3 border-t border-[#30363d]/60 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start justify-between p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <div>
                <span className="text-[12px] font-semibold text-[#f0f6fc] block">Hard Cap Execution Brake</span>
                <span className="text-[11px] text-[#8b949e]">Pause automated reviews if monthly spend reaches 100% ($150.00).</span>
              </div>
              <div className="w-8 h-4.5 bg-neutral-300 rounded-full relative cursor-pointer ml-3 shrink-0">
                <span className="absolute top-[2px] right-[2px] bg-white rounded-full h-3.5 w-3.5 shadow-sm"></span>
              </div>
            </div>

            <div className="flex items-start justify-between p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <div>
                <span className="text-[12px] font-semibold text-[#f0f6fc] block">Slack &amp; PagerDuty Alert Trigger</span>
                <span className="text-[11px] text-[#8b949e]">
                  Dispatch priority warning webhooks when monthly consumption exceeds 80% ($120.00).
                </span>
              </div>
              <div className="w-8 h-4.5 bg-neutral-300 rounded-full relative cursor-pointer ml-3 shrink-0">
                <span className="absolute top-[2px] right-[2px] bg-white rounded-full h-3.5 w-3.5 shadow-sm"></span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
