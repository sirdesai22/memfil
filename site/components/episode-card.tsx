"use client";

import Link from "next/link";
import type { Episode } from "@/lib/data";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CIDBadge } from "@/components/cid-badge";
import { TagBadge } from "@/components/tag-badge";
import { InstallCommand } from "@/components/install-command";
import { cn } from "@/lib/utils";

interface EpisodeCardProps {
  episode: Episode;
  onBuyClick?: (episode: Episode) => void;
  compact?: boolean;
}

export function EpisodeCard({ episode, onBuyClick, compact }: EpisodeCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <Link href={`/episode/${episode.id}`} className="group">
          <h3
            className="font-display text-lg font-bold tracking-tight text-foreground group-hover:underline"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            {episode.name}
          </h3>
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {episode.description}
        </p>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {episode.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
        <CIDBadge cid={episode.cid} />
        {!compact && (
          <InstallCommand name={episode.id} className="text-xs" />
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{episode.author}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{episode.price} FIL</span>
        </div>
        <Button
          className="rounded-full"
          size="sm"
          onClick={() => onBuyClick?.(episode)}
        >
          Buy & Install
        </Button>
      </CardFooter>
    </Card>
  );
}
