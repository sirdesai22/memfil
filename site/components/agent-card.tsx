"use client";

import type { Agent } from "@/lib/data";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/tag-badge";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agent: Agent;
  onAddClick?: (agent: Agent) => void;
}

export function AgentCard({ agent, onAddClick }: AgentCardProps) {
  const priceLabel = agent.price === "free" ? "Free" : `${agent.price} FIL`;

  return (
    <Card className="flex flex-col overflow-hidden border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
            {agent.avatar}
          </div>
          <div>
            <h3
              className="font-display text-lg font-bold tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-playfair-display), serif" }}
            >
              {agent.name}
            </h3>
            <p className="text-sm text-muted-foreground">{agent.author}</p>
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground pt-2">
          {agent.description}
        </p>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {agent.compatibleTags.slice(0, 4).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{agent.installedEpisodes} episodes</span>
          <span>·</span>
          <span className="font-medium text-foreground">{priceLabel}</span>
        </div>
      </CardContent>
      <CardFooter className="border-t border-border pt-4">
        <Button
          className="w-full rounded-full"
          size="sm"
          onClick={() => onAddClick?.(agent)}
        >
          Add Agent
        </Button>
      </CardFooter>
    </Card>
  );
}
