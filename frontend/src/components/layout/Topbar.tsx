"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Github,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Command,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const pathTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/reviews": "Pull Request Reviews",
  "/dashboard/repositories": "Connected Repositories",
  "/dashboard/analytics": "Agent Insights & Dispositions",
  "/dashboard/settings": "Review Configuration",
};

export function Topbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const currentTitle =
    pathTitles[pathname] ||
    (pathname.startsWith("/dashboard/reviews/")
      ? "Review Details"
      : "Dashboard");

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CS";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-md">
      {/* GitHub Primer Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="text-muted-foreground">CodeSentinel</span>
        <ChevronRight className="size-3.5 text-muted-foreground/60" />
        <span className="text-foreground">{currentTitle}</span>
      </div>

      {/* Center Search / Action trigger */}
      <div className="hidden md:flex items-center">
        <div className="flex items-center gap-2 rounded-md border border-border/80 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground shadow-2xs">
          <Search className="size-3.5 text-muted-foreground" />
          <span>Quick find PR or repo...</span>
          <kbd className="pointer-events-none ml-4 inline-flex h-4 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-500" />
          <span>Webhook Verified</span>
        </div>

        {status === "authenticated" && session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative size-8 rounded-full p-0 ring-offset-background transition-opacity hover:opacity-80"
              >
                <Avatar className="size-8 border border-border">
                  {session.user.image && (
                    <AvatarImage
                      src={session.user.image}
                      alt={session.user.name || "User"}
                    />
                  )}
                  <AvatarFallback className="text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold leading-none">{session.user.name}</p>
                  <p className="text-[11px] leading-none text-muted-foreground truncate">
                    {session.user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <a
                    href={
                      process.env.NEXT_PUBLIC_GITHUB_APP_URL ||
                      "https://github.com/apps/review-x/installations/new"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                  >
                    <Github className="size-4" />
                    <span>GitHub App Setup</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                  >
                    <ExternalLink className="size-4" />
                    <span>GitHub Profile</span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/signin" })}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Badge variant="outline" className="font-mono text-xs">
            Review Engine
          </Badge>
        )}
      </div>
    </header>
  );
}
