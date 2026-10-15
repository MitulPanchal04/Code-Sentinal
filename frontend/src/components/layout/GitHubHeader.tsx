"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Code2,
  GitPullRequest,
  BookMarked,
  BarChart3,
  Settings,
  Github,
  Search,
  Bell,
  Star,
  GitFork,
  Eye,
  ExternalLink,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", href: "/dashboard", icon: Code2 },
  { label: "Pull Requests", href: "/dashboard/reviews", icon: GitPullRequest, badge: "Reviews" },
  { label: "Repositories", href: "/dashboard/repositories", icon: BookMarked },
  { label: "Insights", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function GitHubHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CS";

  return (
    <header className="border-b border-border bg-[#161b22] text-[#e6edf3]">
      {/* 1. Primary GitHub Global Navigation Bar */}
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 border-b border-[#30363d]/80 bg-[#010409]">
        {/* Left: Octocat Logo + Repo / Org Context */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 text-white hover:text-white/80 transition-colors"
          >
            <Github className="size-7" />
            <span className="font-semibold text-sm tracking-tight hidden sm:inline-block">
              CodeSentinel
            </span>
          </Link>

          <span className="text-muted-foreground/60 hidden sm:inline-block">/</span>

          {/* Repo Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              CodeSentinel
            </span>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-foreground">code-sentinel</span>
            <Badge
              variant="outline"
              className="ml-1 px-1.5 py-0 text-[10px] font-mono text-muted-foreground border-[#30363d] bg-[#21262d]"
            >
              Public
            </Badge>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="hidden md:flex items-center max-w-sm w-full mx-4">
          <div className="flex w-full items-center justify-between rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-1.5 text-xs text-muted-foreground shadow-2xs hover:border-[#8b949e] transition-colors cursor-text">
            <div className="flex items-center gap-2">
              <Search className="size-3.5 text-muted-foreground" />
              <span>Type <kbd className="font-mono text-[10px] bg-[#21262d] px-1 rounded border border-[#30363d]">/ </kbd> to search</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/60">⌘K</span>
          </div>
        </div>

        {/* Right: Actions, App install & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Agent status badge */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>6 ReAct Agents Active</span>
          </div>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-7 text-xs border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d] hover:text-white"
          >
            <a
              href={
                process.env.NEXT_PUBLIC_GITHUB_APP_URL ||
                "https://github.com/apps/review-x/installations/new"
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github data-icon="inline-start" className="size-3.5" />
              Install App
            </a>
          </Button>

          {/* User Profile Dropdown */}
          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="size-8 rounded-full p-0 ring-offset-background hover:ring-2 hover:ring-primary/50 transition-all"
                >
                  <Avatar className="size-7 border border-[#30363d]">
                    {session.user.image && (
                      <AvatarImage src={session.user.image} alt={session.user.name || "User"} />
                    )}
                    <AvatarFallback className="text-[11px] font-semibold bg-[#21262d] text-white">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#161b22] border-[#30363d] text-[#e6edf3]">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold">{session.user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{session.user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#30363d]" />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="focus:bg-[#21262d] focus:text-white cursor-pointer">
                    <Link href="/dashboard/reviews">
                      <GitPullRequest className="size-4" />
                      <span>Your Pull Requests</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="focus:bg-[#21262d] focus:text-white cursor-pointer">
                    <Link href="/dashboard/repositories">
                      <BookMarked className="size-4" />
                      <span>Your Repositories</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="focus:bg-[#21262d] focus:text-white cursor-pointer">
                    <Link href="/dashboard/settings">
                      <Settings className="size-4" />
                      <span>Configuration</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-[#30363d]" />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/signin" })}
                  className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="h-7 text-xs">
              <Link href="/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Repository Header (Star / Fork / Watch buttons) */}
      <div className="px-4 sm:px-6 pt-4 pb-2 bg-[#161b22]">
        <div className="flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <BookMarked className="size-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-white tracking-tight flex items-center gap-1.5">
              <span>CodeSentinel</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-[#58a6ff]">code-sentinel</span>
            </h1>
            <Badge
              variant="outline"
              className="px-2 py-0.5 text-[11px] font-mono border-[#30363d] text-muted-foreground bg-[#21262d]"
            >
              Public
            </Badge>
          </div>

          {/* GitHub action buttons: Watch / Fork / Star */}
          <div className="flex items-center gap-2 text-xs">
            <div className="inline-flex rounded-md shadow-2xs border border-[#30363d] bg-[#21262d] overflow-hidden">
              <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#e6edf3] hover:bg-[#30363d] transition-colors border-r border-[#30363d]">
                <Eye className="size-3.5 text-muted-foreground" />
                <span>Watch</span>
              </button>
              <span className="px-2 py-1 text-xs font-mono text-muted-foreground bg-[#161b22]">
                12
              </span>
            </div>

            <div className="inline-flex rounded-md shadow-2xs border border-[#30363d] bg-[#21262d] overflow-hidden">
              <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#e6edf3] hover:bg-[#30363d] transition-colors border-r border-[#30363d]">
                <GitFork className="size-3.5 text-muted-foreground" />
                <span>Fork</span>
              </button>
              <span className="px-2 py-1 text-xs font-mono text-muted-foreground bg-[#161b22]">
                28
              </span>
            </div>

            <div className="inline-flex rounded-md shadow-2xs border border-[#30363d] bg-[#21262d] overflow-hidden">
              <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#e6edf3] hover:bg-[#30363d] transition-colors border-r border-[#30363d]">
                <Star className="size-3.5 text-amber-400 fill-amber-400" />
                <span>Star</span>
              </button>
              <span className="px-2 py-1 text-xs font-mono text-muted-foreground bg-[#161b22]">
                142
              </span>
            </div>
          </div>
        </div>

        {/* 3. GitHub Underline Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-4 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active =
              pathname === tab.href ||
              (tab.href !== "/dashboard" && pathname.startsWith(tab.href));

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap",
                  active
                    ? "border-[#fd8c73] text-white font-semibold"
                    : "border-transparent text-muted-foreground hover:border-[#8b949e]/50 hover:text-[#e6edf3]"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 transition-colors",
                    active ? "text-white" : "text-muted-foreground group-hover:text-white"
                  )}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0 text-[10px] font-mono",
                      active
                        ? "bg-[#fd8c73]/20 text-[#fd8c73] font-semibold"
                        : "bg-[#21262d] text-muted-foreground"
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
