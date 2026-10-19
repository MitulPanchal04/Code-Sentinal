"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Shield,
  Terminal,
  Cpu,
  KeyRound,
  Lock,
  ArrowRight,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [enterpriseDomain, setEnterpriseDomain] = useState("github.internal.corp");

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const handleSignIn = () => {
    setLoading(true);
    signIn("github", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F17] text-slate-200 antialiased font-sans flex flex-col justify-between selection:bg-[#5DB579]/20 selection:text-[#80d99a]">
      <main className="min-h-screen w-full flex flex-col lg:flex-row relative">
        {/* LEFT COLUMN: Platform Showcase & Live Terminal Simulation (60% width) */}
        <section className="w-full lg:w-[60%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-[#1E293B] relative bg-[#0B0F17] overflow-hidden">
          {/* Ambient technical blueprint grid layer */}
          <div className="absolute inset-0 blueprint-grid pointer-events-none opacity-40" />

          {/* Top Brand Header */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-[#1E293B]/70">
            <div className="flex items-center gap-3.5">
              <div className="h-9 w-9 rounded-lg bg-[#161D2C] border border-[#334155] flex items-center justify-center shadow-inner text-[#5DB579]">
                <Shield className="size-5" />
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="font-bold text-xl tracking-tight text-white">CodeSentinel</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#161D2C] border border-[#1E293B] text-slate-400 font-medium">
                  v2.4-enterprise
                </span>
              </div>
            </div>

            {/* Live System Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111622] border border-[#1E293B] shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-[#5DB579] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5DB579]" />
              </span>
              <span className="font-mono text-xs font-medium text-slate-300">Operational</span>
              <span className="text-slate-600 text-xs">•</span>
              <span className="font-mono text-[11px] text-slate-400">99.99% SLO</span>
            </div>
          </div>

          {/* Hero Section */}
          <div className="relative z-10 py-10 lg:py-12 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#161D2C] border border-[#1E293B] text-[#80d99a] font-mono text-[11px] font-medium tracking-wide uppercase mb-4">
              <GitBranch className="size-3.5" />
              Deterministic PR Gatekeeper
            </div>
            <h1 className="font-semibold text-3xl sm:text-4xl lg:text-[40px] leading-[1.15] text-white tracking-tight">
              Autonomous Code Review &amp; Multi-Agent PR Governance
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-400 font-normal leading-relaxed max-w-2xl">
              Continuous inspection powered by 6 specialized static &amp; semantic AI agents. Real-time security vulnerability detection, architectural invariants, type safety, and custom repo rulebooks.
            </p>
          </div>

          {/* Live Terminal Simulation Card */}
          <div className="relative z-10 my-4 rounded-lg bg-[#080B10] border border-[#1E293B] overflow-hidden shadow-2xl shadow-black/80 font-mono text-xs">
            {/* Terminal Window Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#0F141E] border-b border-[#1E293B] select-none">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 mr-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f43f5e]/80 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]/80 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5db579]/80 inline-block" />
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#080B10] border border-[#1E293B] text-slate-300 text-[11px]">
                  <Terminal className="size-3 text-slate-400" />
                  <span>sentinel-runner --pr=142 --strictness=HIGH</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="px-2 py-0.5 rounded bg-[#161D2C] border border-[#1E293B]">
                  PID: 9482 • 4.2s runtime
                </span>
              </div>
            </div>

            {/* Terminal Log Feed */}
            <div className="p-5 space-y-2 text-slate-300 leading-relaxed font-mono">
              <div className="flex items-start gap-2.5">
                <span className="text-slate-500 shrink-0">[15:42:01]</span>
                <span className="text-sky-400 font-semibold shrink-0">INF</span>
                <span>
                  <span className="text-slate-100 font-medium">Agent 1 (Security Sentinel):</span> AST scan complete.{" "}
                  <span className="text-[#5DB579]">0 critical vulnerabilities</span>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-slate-500 shrink-0">[15:42:02]</span>
                <span className="text-amber-400 font-semibold shrink-0">WRN</span>
                <span>
                  <span className="text-slate-100 font-medium">Agent 2 (Performance):</span> Unindexed DB query detected in{" "}
                  <span className="underline decoration-slate-600 underline-offset-2 text-amber-200">user_service.py:184</span>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-slate-500 shrink-0">[15:42:03]</span>
                <span className="text-sky-400 font-semibold shrink-0">INF</span>
                <span>
                  <span className="text-slate-100 font-medium">Agent 3 (Type Compliance):</span> 100% strict type inference validated.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-slate-500 shrink-0">[15:42:04]</span>
                <span className="text-sky-400 font-semibold shrink-0">INF</span>
                <span>
                  <span className="text-slate-100 font-medium">Agent 4 (Architecture):</span> Invariant Rule #3 checked: Domain layer isolation preserved.
                </span>
              </div>
              <div className="flex items-start gap-2.5 pt-1 border-t border-[#1E293B]/60">
                <span className="text-slate-500 shrink-0">[15:42:05]</span>
                <span className="text-[#5DB579] font-semibold shrink-0">SUC</span>
                <span className="text-[#80d99a] font-medium">
                  Consensus reached: PR #142 approved with 1 non-blocking suggestion.
                </span>
              </div>

              {/* Terminal Prompt Line */}
              <div className="flex items-center gap-2 pt-2 text-slate-300">
                <span className="text-[#5DB579] font-bold">$</span>
                <span>sentinel ready --listening-for-webhooks</span>
                <span className="inline-block w-2 h-4 bg-[#5DB579] animate-cursor align-middle ml-0.5" />
              </div>
            </div>
          </div>

          {/* Trust & Compliance Grid */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
            <div className="p-4 rounded-lg bg-[#111622] border border-[#1E293B] hover:border-[#334155] transition-colors">
              <div className="flex items-center gap-2 text-slate-100 font-medium text-xs mb-1.5">
                <Cpu className="size-4 text-[#5DB579]" />
                Zero Source Code Retention
              </div>
              <p className="text-[12px] text-slate-400 leading-normal">
                Repositories are processed ephemerally in RAM. Code is never stored or used for LLM training.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#111622] border border-[#1E293B] hover:border-[#334155] transition-colors">
              <div className="flex items-center gap-2 text-slate-100 font-medium text-xs mb-1.5">
                <Shield className="size-4 text-[#5DB579]" />
                Granular RBAC &amp; Rulebooks
              </div>
              <p className="text-[12px] text-slate-400 leading-normal">
                Enforce repository-specific guidelines, team review policies, and strictness thresholds.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#111622] border border-[#1E293B] hover:border-[#334155] transition-colors">
              <div className="flex items-center gap-2 text-slate-100 font-medium text-xs mb-1.5">
                <KeyRound className="size-4 text-[#5DB579]" />
                Cryptographic Attestation
              </div>
              <p className="text-[12px] text-slate-400 leading-normal">
                Verified GitHub App HMAC signatures with sub-second webhook processing pipeline.
              </p>
            </div>
          </div>

          {/* Left Bottom Micro Details */}
          <div className="relative z-10 pt-6 mt-6 border-t border-[#1E293B]/70 flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono">
            <div>SHA: 8f42d99c • Node Cluster: us-east-prod-04</div>
            <div className="flex items-center gap-3">
              <span className="hover:text-slate-300 transition-colors cursor-pointer">Documentation</span>
              <span>•</span>
              <span className="hover:text-slate-300 transition-colors cursor-pointer">Terminal Access</span>
              <span>•</span>
              <span className="hover:text-slate-300 transition-colors cursor-pointer">Audit Logs</span>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Centered Authentication Card (40% width) */}
        <section className="w-full lg:w-[40%] flex flex-col justify-between items-center p-6 sm:p-12 lg:p-16 bg-[#0D121C] relative">
          {/* Subtle Ambient Glow Behind Card */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <div className="w-[480px] h-[480px] rounded-full bg-[#5DB579]/5 blur-[120px]" />
          </div>

          <div className="w-full flex justify-end items-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#161D2C] border border-[#1E293B] text-slate-400 text-xs">
              <Lock className="size-3.5" />
              <span>256-bit TLS Enforced</span>
            </div>
          </div>

          {/* Elevated Authentication Card */}
          <div className="relative z-10 w-full max-w-md my-auto">
            <div className="rounded-xl bg-[#161D2C] border border-[#334155] p-8 sm:p-10 shadow-2xl shadow-black/90">
              {/* Card Header */}
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-[#5DB579]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">
                    Enterprise Gateway
                  </span>
                </div>
                <h2 className="font-semibold text-2xl text-white tracking-tight">
                  Sign in to CodeSentinel
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Access your organization workspaces, review dashboards, and agent telemetry.
                </p>
              </div>

              {/* Primary OAuth Action: Continue with GitHub */}
              <div className="space-y-4">
                <button
                  onClick={handleSignIn}
                  disabled={loading || status === "loading"}
                  className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-medium text-sm transition-all duration-150 shadow-sm active:scale-[0.99] group focus:outline-none focus:ring-2 focus:ring-[#5DB579] focus:ring-offset-2 focus:ring-offset-[#161D2C] disabled:opacity-60 cursor-pointer"
                  type="button"
                >
                  {loading || status === "loading" ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
                  ) : (
                    <svg
                      aria-hidden="true"
                      className="w-5 h-5 fill-current text-slate-950 group-hover:scale-105 transition-transform"
                      viewBox="0 0 24 24"
                    >
                      <path
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        fillRule="evenodd"
                      />
                    </svg>
                  )}
                  <span>{loading || status === "loading" ? "Connecting to GitHub..." : "Continue with GitHub"}</span>
                </button>
              </div>

              {/* Hairline Divider */}
              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1E293B]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
                  <span className="bg-[#161D2C] px-3 text-slate-400 font-medium">OR ENTERPRISE SSO</span>
                </div>
              </div>

              {/* Enterprise Server / SAML Domain Form */}
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSignIn();
                }}
              >
                <div>
                  <label className="block font-mono text-xs font-medium text-slate-300 mb-2" htmlFor="enterprise-domain">
                    GitHub Enterprise Server / SAML Domain
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <input
                      className="block w-full rounded-lg bg-[#0B0F17] border border-[#1E293B] px-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:border-[#5DB579] focus:ring-1 focus:ring-[#5DB579] transition-colors focus:outline-hidden"
                      id="enterprise-domain"
                      name="domain"
                      placeholder="company.ghe.com or okta ID"
                      type="text"
                      value={enterpriseDomain}
                      onChange={(e) => setEnterpriseDomain(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  className="w-full h-11 flex items-center justify-center gap-2 px-4 rounded-lg bg-[#026d39] hover:bg-[#5db579] text-white hover:text-[#004321] font-medium text-xs tracking-wide transition-all duration-150 shadow-md shadow-[#026d39]/20 focus:outline-hidden focus:ring-2 focus:ring-[#5DB579] cursor-pointer"
                  type="submit"
                >
                  <span>Continue with SAML / SSO</span>
                  <ArrowRight className="size-4" />
                </button>
              </form>

              {/* Alternative Workspaces / Self-hosted Link */}
              <div className="mt-6 pt-5 border-t border-[#1E293B] text-center">
                <a
                  className="text-xs text-slate-400 hover:text-[#80d99a] transition-colors inline-flex items-center gap-1"
                  href="https://github.com/apps/review-x"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Need help connecting your self-hosted runner?</span>
                  <span className="text-slate-300 underline underline-offset-2">View documentation →</span>
                </a>
              </div>

              {/* Security Notice */}
              <div className="mt-6 p-3 rounded-lg bg-[#0B0F17] border border-[#1E293B] flex items-start gap-2.5">
                <Lock className="size-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Read-only repository access during webhook events. OAuth tokens encrypted at rest via{" "}
                  <span className="font-mono text-slate-300">AES-GCM-256</span>.
                </p>
              </div>

              {/* System Status Indicator at bottom of card */}
              <div className="mt-5 pt-4 border-t border-[#1E293B] flex items-center justify-between text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-[#5DB579] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5DB579]" />
                  </span>
                  <span>All review workers active</span>
                </div>
                <span className="text-slate-500 font-mono">(4/4 clusters online)</span>
              </div>
            </div>
          </div>

          {/* Right Column Footer Navigation Links */}
          <footer className="relative z-10 w-full pt-6 text-center lg:text-right">
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="hover:text-slate-300 transition-colors cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-slate-300 transition-colors cursor-pointer">Security Whitepaper</span>
              <span>•</span>
              <span className="hover:text-slate-300 transition-colors cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-slate-300 transition-colors cursor-pointer">Status Page</span>
              <span>•</span>
              <span className="text-[#80d99a] inline-flex items-center gap-1 font-mono text-[11px]">
                <CheckCircle2 className="size-3.5" />
                SOC 2 Type II Certified
              </span>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
