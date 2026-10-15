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

export function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-red-500 bg-red-500/10";
    case "warning":
      return "text-yellow-500 bg-yellow-500/10";
    case "info":
      return "text-blue-500 bg-blue-500/10";
    default:
      return "text-gray-500 bg-gray-500/10";
  }
}

export function scoreColor(score: number): string {
  if (score <= 1) return "text-red-500";
  if (score <= 2) return "text-orange-500";
  if (score <= 3) return "text-yellow-500";
  if (score <= 4) return "text-green-500";
  return "text-emerald-500";
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
