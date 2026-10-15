"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  GitPullRequest,
  BookMarked,
  BarChart3,
  Settings,
  Github,
  Shield,
  LogOut,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Reviews", href: "/dashboard/reviews", icon: GitPullRequest },
  { label: "Repositories", href: "/dashboard/repositories", icon: BookMarked },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidenav() {
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
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex size-7 items-center justify-center rounded-lg border border-border bg-background shadow-xs transition-colors group-hover:border-primary">
            <Shield className="size-4 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight">CodeSentinel</span>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-mono leading-tight">
              AI
            </Badge>
          </div>
        </Link>
      </div>

      {/* Navigation Section */}
      <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
        <nav className="flex flex-col gap-1">
          <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                  <span>{item.label}</span>
                </div>
                {active && (
                  <div className="size-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}

          <div className="mt-6 px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Platform & Docs
          </div>
          <a
            href="https://github.com/CodeSewer/codesentinel"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <div className="flex items-center gap-2.5">
              <Github className="size-4 text-muted-foreground" />
              <span>GitHub Repo</span>
            </div>
            <ExternalLink className="size-3 text-muted-foreground/60" />
          </a>
        </nav>

        {/* Live Status indicator */}
        <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Review Pipeline</span>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono text-emerald-500">Active</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            6 ReAct agents listening on webhooks
          </p>
        </div>
      </div>

      <Separator />

      {/* User & Actions Footer */}
      <div className="flex flex-col gap-3 p-3">
        {session?.user && (
          <div className="flex items-center gap-2.5 px-1 py-0.5">
            <Avatar className="size-8 border border-border">
              {session.user.image && <AvatarImage src={session.user.image} alt={session.user.name || "User"} />}
              <AvatarFallback className="text-xs font-medium">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-semibold leading-tight">{session.user.name}</span>
              <span className="truncate text-[11px] text-muted-foreground leading-tight">
                {session.user.email}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="flex-1 font-medium text-xs"
          >
            <a
              href={
                process.env.NEXT_PUBLIC_GITHUB_APP_URL ||
                "https://github.com/apps/review-x/installations/new"
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github data-icon="inline-start" />
              Install App
            </a>
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => signOut({ callbackUrl: "/signin" })}
            title="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
