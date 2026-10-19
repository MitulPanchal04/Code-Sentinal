import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const tz = process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Kolkata";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function severityBadgeClasses(severity: string): string {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "border-destructive/40 bg-destructive/15 text-destructive font-medium";
    case "warning":
      return "border-amber-500/40 bg-amber-500/15 text-amber-500 dark:text-amber-400 font-medium";
    case "info":
      return "border-blue-500/40 bg-blue-500/15 text-blue-500 dark:text-blue-400 font-medium";
    default:
      return "border-muted-foreground/30 bg-muted text-muted-foreground font-medium";
  }
}

export function scoreBadgeClasses(score: number | null): string {
  if (score === null || score === undefined) {
    return "border-border bg-muted text-muted-foreground";
  }
  if (score <= 1) {
    return "border-destructive/40 bg-destructive/15 text-destructive";
  }
  if (score <= 2) {
    return "border-orange-500/40 bg-orange-500/15 text-orange-500 dark:text-orange-400";
  }
  if (score <= 3) {
    return "border-amber-500/40 bg-amber-500/15 text-amber-500 dark:text-amber-400";
  }
  if (score <= 4) {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  }
  return "border-emerald-500/50 bg-emerald-500/20 text-emerald-500 font-bold";
}

export function scoreColor(score: number): string {
  if (score <= 1) return "text-destructive";
  if (score <= 2) return "text-orange-500 dark:text-orange-400";
  if (score <= 3) return "text-amber-500 dark:text-amber-400";
  if (score <= 4) return "text-emerald-500 dark:text-emerald-400";
  return "text-emerald-500 dark:text-emerald-400";
}

export function severityColor(severity: string): string {
  return severityBadgeClasses(severity);
}

export function reviewStatusBadge(status: string): string {
  switch (status) {
    case "complete":
      return "bg-green-500/10 text-green-500";
    case "failed":
      return "bg-red-500/10 text-red-500";
    case "not_reviewed":
      return "bg-secondary text-muted-foreground";
    default:
      return "bg-yellow-500/10 text-yellow-500";
  }
}

export function reviewStatusLabel(status: string): string {
  switch (status) {
    case "not_reviewed":
      return "not reviewed";
    case "pending":
      return "in progress";
    default:
      return status;
  }
}

export function prStateBadge(state: string | null | undefined): string {
  switch (state) {
    case "merged":
      return "bg-purple-500/10 text-purple-500";
    case "closed":
      return "bg-red-500/10 text-red-500";
    default:
      return "bg-blue-500/10 text-blue-500";
  }
}
