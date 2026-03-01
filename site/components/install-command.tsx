"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InstallCommandProps {
  name: string;
  token?: string;
  registry?: string;
  className?: string;
}

export function InstallCommand({
  name,
  token,
  registry = "episodemarket",
  className,
}: InstallCommandProps) {
  const [copied, setCopied] = useState(false);
  const command = token
    ? `pnpm add episode ${name} --token ${token} --registry ${registry}`
    : `pnpm add episode ${name} --registry ${registry}`;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg bg-black px-3 py-2 font-mono text-sm text-white",
        className
      )}
    >
      <code className="truncate flex-1">{command}</code>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-white hover:bg-white/20"
            onClick={copyToClipboard}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied!" : "Copy command"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
