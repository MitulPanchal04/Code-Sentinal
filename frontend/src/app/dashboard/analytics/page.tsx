"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api, Installation } from "@/lib/api";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Clock,
  Sparkles,
  BookMarked,
  ShieldCheck,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface InsightData {
  window: string;
  total_findings: number;
  disputed_findings: number;
  resolved_findings: number;
  quiet_drops: number;
}

export default function AnalyticsPage() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeWindow, setActiveWindow] = useState<string>("30d");

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.listInstallations();
      const instList = data.installations || [];
      setInstallations(instList);

      if (instList.length > 0) {
        const allInsights = await Promise.all(
          instList.map((inst) =>
            api
              .getInsights(inst.installation_id)
              .catch(() => ({ insights: [] }))
          )
        );

        const aggregated: Record<string, InsightData> = {};
        for (const result of allInsights) {
          for (const item of result.insights as any[]) {
            const w = item.window || "30d";
            if (!aggregated[w]) {
              aggregated[w] = {
                window: w,
                total_findings: 0,
                disputed_findings: 0,
                resolved_findings: 0,
                quiet_drops: 0,
              };
            }
            aggregated[w].total_findings += item.total_findings || 0;
            aggregated[w].disputed_findings += item.disputed_findings || 0;
            aggregated[w].resolved_findings += item.resolved_findings || 0;
            aggregated[w].quiet_drops += item.quiet_drops || 0;
          }
        }
        setInsights(Object.values(aggregated));
      } else {
        setInsights([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load analytics: ${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentInsight = useMemo(() => {
    const found = insights.find((i) => i.window === activeWindow);
    return (
      found || {
        window: activeWindow,
        total_findings: 0,
        disputed_findings: 0,
        resolved_findings: 0,
        quiet_drops: 0,
      }
    );
  }, [insights, activeWindow]);

  const totalEvaluated = currentInsight.total_findings || 0;
  const resolutionRate =
    totalEvaluated > 0
      ? Math.round((currentInsight.resolved_findings / totalEvaluated) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* GitHub Insights Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Repository Insights & Dispositions</h1>
          <p className="text-xs text-muted-foreground pt-0.5">
            Agent finding accuracy, false-positive filtering rates, and developer resolutions.
          </p>
        </div>

        {/* Timeframe pill tabs */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-[#30363d] bg-[#21262d] p-0.5 text-xs">
            {["7d", "30d", "90d"].map((w) => (
              <button
                key={w}
                onClick={() => setActiveWindow(w)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeWindow === w
                    ? "bg-[#30363d] text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {w === "7d" ? "7 days" : w === "30d" ? "30 days" : "90 days"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="h-7 text-xs border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d]"
          >
            <RefreshCw
              data-icon="inline-start"
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "..." : "Sync"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]">
          <AlertCircle className="size-4" />
          <AlertTitle>Analytics Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* GitHub Insight Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Total Issues Flagged
          </span>
          <span className="text-2xl font-bold font-mono text-white tabular-nums">
            {currentInsight.total_findings}
          </span>
          <span className="text-[11px] text-muted-foreground">In past {activeWindow}</span>
        </div>

        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Resolved by Authors
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {currentInsight.resolved_findings}
          </span>
          <span className="text-[11px] text-muted-foreground">{resolutionRate}% fix rate</span>
        </div>

        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Disputed / Dismissed
          </span>
          <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {currentInsight.disputed_findings}
          </span>
          <span className="text-[11px] text-muted-foreground">Reported by developers</span>
        </div>

        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Quiet Drops (FP Filter)
          </span>
          <span className="text-2xl font-bold font-mono text-[#58a6ff] tabular-nums">
            {currentInsight.quiet_drops}
          </span>
          <span className="text-[11px] text-muted-foreground">Blocked by verifier</span>
        </div>
      </div>

      {/* Repositories Performance Table */}
      <div className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
        <div className="border-b border-[#30363d] bg-[#21262d] px-4 py-2.5">
          <h2 className="text-xs font-semibold text-white">Repository Review Breakdown</h2>
        </div>

        <div className="divide-y divide-[#30363d]/60 text-xs">
          {installations.map((inst) => (
            <div
              key={`${inst.installation_id}-${inst.repo_full_name}`}
              className="flex items-center justify-between p-4 hover:bg-[#21262d]/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <BookMarked className="size-4 text-muted-foreground" />
                <span className="font-semibold text-[#58a6ff]">{inst.repo_full_name}</span>
                <span className="text-muted-foreground font-mono">#{inst.installation_id}</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="rounded bg-[#21262d] px-2 py-0.5 font-mono text-[11px] text-[#e6edf3] border border-[#30363d]">
                  {inst.model_id || "gpt-4o"}
                </span>

                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
