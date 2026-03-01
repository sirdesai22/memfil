"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CIDBadgeProps {
  cid: string;
  className?: string;
}

const TRUNCATE_LENGTH = 12;

export function CIDBadge({ cid, className }: CIDBadgeProps) {
  const [copied, setCopied] = useState(false);
  const truncated = cid.length > TRUNCATE_LENGTH * 2 
    ? `${cid.slice(0, TRUNCATE_LENGTH)}...${cid.slice(-TRUNCATE_LENGTH)}`
    : cid;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(cid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground",
        className
      )}
    >
      <span className="truncate max-w-[140px]" title={cid}>
        {truncated}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={copyToClipboard}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied!" : "Copy CID"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={ipfsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </TooltipTrigger>
        <TooltipContent>View on IPFS</TooltipContent>
      </Tooltip>
    </div>
  );
}
