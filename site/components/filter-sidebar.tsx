"use client";

import { MEMORY_TAGS, type MemoryTag } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortOption = "newest" | "most-installed" | "price-low" | "price-high";

interface MemoryFilterSidebarProps {
  selectedTags: MemoryTag[];
  onTagsChange: (tags: MemoryTag[]) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  "most-installed": "Most installed",
  "price-low": "Price: Low to high",
  "price-high": "Price: High to low",
};

export function MemoryFilterSidebar({
  selectedTags,
  onTagsChange,
  sort,
  onSortChange,
  priceRange,
  onPriceRangeChange,
}: MemoryFilterSidebarProps) {
  const toggleTag = (tag: MemoryTag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Tags */}
      <div className="space-y-1.5">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Tags
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MEMORY_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                selectedTags.includes(tag)
                  ? "bg-amber-900/15 text-amber-900 dark:bg-amber-100/15 dark:text-amber-200"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Sort */}
      <div className="space-y-1.5">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Sort
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-full justify-between gap-1 text-xs">
              {SORT_LABELS[sort]}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
              <DropdownMenuItem key={opt} onClick={() => onSortChange(opt)}>
                {SORT_LABELS[opt]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator className="opacity-50" />

      {/* Price range */}
      <div className="space-y-2">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Price
        </p>
        <span className="block px-1 text-xs text-muted-foreground">
          {priceRange[0].toFixed(2)} – {priceRange[1].toFixed(2)} FIL
        </span>
        <Slider
          value={priceRange}
          onValueChange={(v) => onPriceRangeChange(v as [number, number])}
          min={0}
          max={1}
          step={0.05}
          className="w-full"
        />
      </div>
    </div>
  );
}

interface AgentFilterSidebarProps {
  selectedTags: MemoryTag[];
  onTagsChange: (tags: MemoryTag[]) => void;
  showFreeOnly: boolean;
  onShowFreeOnlyChange: (v: boolean) => void;
}

export function AgentFilterSidebar({
  selectedTags,
  onTagsChange,
  showFreeOnly,
  onShowFreeOnlyChange,
}: AgentFilterSidebarProps) {
  const toggleTag = (tag: MemoryTag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-medium text-foreground">Compatibility</h3>
        <div className="flex flex-wrap gap-2">
          {MEMORY_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedTags.includes(tag)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="free-only"
            checked={showFreeOnly}
            onChange={(e) => onShowFreeOnlyChange(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="free-only" className="text-sm font-normal cursor-pointer">
            Free only
          </Label>
        </div>
      </div>
    </div>
  );
}

// ── Registry Agent Filter Sidebar ────────────────────────────────────────────

const PROTOCOLS = ["all", "mcp", "a2a"] as const;
export type ProtocolFilter = (typeof PROTOCOLS)[number];

interface RegistryAgentFilterSidebarProps {
  protocol: ProtocolFilter;
  onProtocolChange: (p: ProtocolFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  network: string;
  onNetworkChange: (n: string) => void;
  networks: { id: string; name: string }[];
  showIncompleteAgents: boolean;
  onShowIncompleteAgentsChange: (v: boolean) => void;
}

const PROTOCOL_LABELS: Record<ProtocolFilter, string> = {
  all: "All protocols",
  mcp: "MCP",
  a2a: "A2A",
};

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </p>
      {children}
    </div>
  );
}

function SidebarNavItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-all duration-150",
        active
          ? "bg-amber-900/10 font-semibold text-amber-900 dark:bg-amber-100/10 dark:text-amber-200"
          : "font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function RegistryAgentFilterSidebar({
  protocol,
  onProtocolChange,
  searchQuery,
  onSearchChange,
  network,
  onNetworkChange,
  networks,
  showIncompleteAgents,
  onShowIncompleteAgentsChange,
}: RegistryAgentFilterSidebarProps) {
  return (
    <div className="space-y-5">
      <SidebarSection label="Network">
        <div className="flex flex-col gap-0.5">
          {networks.map((n) => (
            <SidebarNavItem
              key={n.id}
              active={network === n.id}
              onClick={() => onNetworkChange(n.id)}
            >
              {n.name}
            </SidebarNavItem>
          ))}
        </div>
      </SidebarSection>

      <Separator className="opacity-50" />

      <SidebarSection label="Search">
        <input
          type="text"
          placeholder="Name or address…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-full rounded-md border border-border bg-muted/40 px-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-amber-700/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-amber-700/30 dark:focus:border-amber-400/40 dark:focus:ring-amber-400/20"
        />
      </SidebarSection>

      <Separator className="opacity-50" />

      <SidebarSection label="Protocol">
        <div className="flex flex-col gap-0.5">
          {PROTOCOLS.map((p) => (
            <SidebarNavItem
              key={p}
              active={protocol === p}
              onClick={() => onProtocolChange(p)}
            >
              {PROTOCOL_LABELS[p]}
            </SidebarNavItem>
          ))}
        </div>
      </SidebarSection>

      <Separator className="opacity-50" />

      <div className="flex items-start gap-2.5 px-0.5">
        <input
          type="checkbox"
          id="show-incomplete"
          checked={showIncompleteAgents}
          onChange={(e) => onShowIncompleteAgentsChange(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border-border accent-amber-800"
        />
        <Label
          htmlFor="show-incomplete"
          className="cursor-pointer text-xs font-normal leading-snug text-muted-foreground"
        >
          Show agents without image or metadata
        </Label>
      </div>
    </div>
  );
}
