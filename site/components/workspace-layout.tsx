"use client";

import { cn } from "@/lib/utils";

interface WorkspaceLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function WorkspaceLayout({ sidebar, children, className }: WorkspaceLayoutProps) {
  return (
    <div className={cn("flex min-h-[calc(100vh-3.5rem)]", className)}>
      {/* Left sidebar */}
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:block">
        <div className="px-4 py-5">
          {sidebar}
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        <div className="px-5 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
