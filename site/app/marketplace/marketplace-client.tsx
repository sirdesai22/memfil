"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Search,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import Link from "next/link";
import { RegistryAgentCard, HealthDot, type HealthStatus } from "@/components/agent-card";
import { AgentCardSkeleton } from "@/components/agent-card-skeleton";
import { AgentDetailPanel } from "@/components/agent-detail-panel";
import { RegisterAgentDialog } from "@/components/register-agent-dialog";
import { Slider } from "@/components/ui/slider";
import type { RegistryAgent } from "@/lib/registry";
import type { GetAgentsPageResult } from "@/lib/agents";
import { NETWORKS, NETWORK_IDS, type NetworkId } from "@/lib/networks";
import { computeCreditScore, type CreditTier } from "@/lib/credit-score";
import { parseAgentCardServices, type AgentCard } from "@/lib/agent-validator";
import { resolveAgentImage } from "@/lib/agent-logos";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const CINZEL = "var(--font-cinzel, Cinzel, serif)";
const NETWORK_OPTIONS = NETWORK_IDS.map((id) => ({ id, name: NETWORKS[id].name }));

type SortBy = "default" | "score" | "reviews" | "rating";
type ViewMode = "list" | "grid";

/** Preset for the "Showing" dropdown */
type ShowingPreset = "all" | "x402" | CreditTier;

const ALL_TIERS: CreditTier[] = ["new", "bronze", "silver", "gold", "platinum"];
const TIER_LABELS: Record<CreditTier, string> = {
  new: "New",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

interface MarketplaceClientProps {
  initialData: GetAgentsPageResult;
  initialNetwork: NetworkId;
}

interface EndpointRow {
  method: string;
  path: string;
  description: string;
  price: string;
}

function formatDescription(text: string): string {
  return text.replace(/\b(1[5-9]\d{8}|2\d{9})\b/g, (ts) =>
    new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  );
}

function agentInitialsSvg(seed: string, name: string): string {
  const PALETTES = [
    ["#1a2744", "#6a8fd8"],
    ["#0f2b1c", "#4caf7a"],
    ["#26133d", "#a87ad4"],
    ["#2e1808", "#d4935a"],
    ["#0f2828", "#4abdb0"],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const [bg, fg] = PALETTES[Math.abs(h) % PALETTES.length];
  const words = name.replace(/^Agent\s*#?\d*\s*/i, "").trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.replace(/\s+/g, "").slice(0, 2).toUpperCase() || "?";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
    <rect width="48" height="48" fill="${bg}" rx="8"/>
    <text x="24" y="28" text-anchor="middle" dominant-baseline="middle" font-family="Georgia,serif" font-size="18" font-weight="bold" fill="${fg}">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function extractEndpoints(agent: RegistryAgent): EndpointRow[] {
  const md = agent.metadata;
  if (!md) return [];

  const services = md.services;
  if (Array.isArray(services) && services.length > 0) {
    return services.map((s: Record<string, unknown>, i: number) => {
      const endpoint = String(s?.endpoint ?? "");
      let path = "/";
      try {
        if (endpoint.startsWith("http")) {
          const u = new URL(endpoint);
          path = u.pathname + u.search || "/";
        } else if (endpoint) {
          path = endpoint;
        }
      } catch {
        path = endpoint || "/";
      }
      const method = String(s?.method ?? "POST").toUpperCase();
      const cost = s?.cost ?? (s?.payment as Record<string, unknown> | undefined)?.amount ?? "";
      const currency =
        String(s?.currency ?? (s?.payment as Record<string, unknown> | undefined)?.currency ?? "USDC");
      const price = cost !== "" && cost != null ? `${cost} ${currency}` : "—";
      const desc = String(
        (s?.description as string) ?? (s?.name as string) ?? `Service ${i + 1}`
      );
      return { method, path: path || "/", description: desc, price };
    });
  }

  const parsed = parseAgentCardServices(md as AgentCard);
  if (parsed?.x402Endpoint) {
    let path = "/";
    try {
      const u = new URL(parsed.x402Endpoint);
      path = u.pathname + u.search || "/";
    } catch {
      path = parsed.x402Endpoint;
    }
    return [
      {
        method: "POST",
        path,
        description: "x402 payment endpoint",
        price: parsed.cost ? `${parsed.cost} ${parsed.currency}` : "—",
      },
    ];
  }

  const mcp = agent.metadata?.mcpEndpoint;
  const a2a = agent.metadata?.a2aEndpoint;
  const fallback = mcp || a2a;
  if (fallback) {
    let path = "/";
    try {
      const u = new URL(fallback);
      path = u.pathname + u.search || "/";
    } catch {
      path = fallback;
    }
    return [{ method: "POST", path, description: "Agent endpoint", price: "—" }];
  }

  return [];
}

function primaryServiceUrl(agent: RegistryAgent): string {
  const md = agent.metadata;
  if (!md) return agent.agentURI ?? "";
  return (
    md.mcpEndpoint ??
    md.a2aEndpoint ??
    md.healthUrl ??
    agent.agentURI ??
    ""
  );
}

function presetToState(preset: ShowingPreset): { tier: CreditTier | null; x402: boolean } {
  if (preset === "all") return { tier: null, x402: false };
  if (preset === "x402") return { tier: null, x402: true };
  return { tier: preset, x402: false };
}

export function MarketplaceClient({ initialData, initialNetwork }: MarketplaceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [agents, setAgents] = useState<RegistryAgent[]>(initialData.items);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkId>(initialNetwork);
  const [currentPage, setCurrentPage] = useState(initialData.page);
  const [hasMore, setHasMore] = useState(initialData.hasMore);
  const [total, setTotal] = useState(initialData.total);
  const [tierFilter, setTierFilter] = useState<CreditTier | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("default");
  const [maxCostUsdc, setMaxCostUsdc] = useState<number>(10);
  const [x402Only, setX402Only] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [panelAgentId, setPanelAgentId] = useState<string | null>(null);
  const [panelNetworkId, setPanelNetworkId] = useState<NetworkId>(initialNetwork);
  const [panelOpen, setPanelOpen] = useState(false);
  const [healthMap, setHealthMap] = useState<Record<string, HealthStatus>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchAgents = useCallback(
    async (page: number, net: NetworkId) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: PAGE_SIZE.toString(),
          network: net,
        });
        if (x402Only) params.set("x402", "true");
        if (net === "filecoinCalibration") params.set("noCache", "1");
        const res = await fetch(`/api/agents?${params}`);
        const data = await res.json();
        if (data.success) {
          setAgents(data.items);
          setCurrentPage(page);
          setHasMore(data.hasMore);
          setTotal(data.total);
        } else {
          setError(data.error ?? "Failed to fetch agents");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      } finally {
        setIsLoading(false);
      }
    },
    [x402Only]
  );

  const handleNetworkChange = useCallback(
    (net: string) => {
      const n = net as NetworkId;
      setNetwork(n);
      const next = new URLSearchParams(searchParams.toString());
      next.set("network", n);
      router.push(`/marketplace?${next.toString()}`, { scroll: false });
      fetchAgents(1, n);
    },
    [searchParams, router, fetchAgents]
  );

  useEffect(() => {
    const urlNet = searchParams.get("network") as NetworkId | null;
    if (urlNet && NETWORK_IDS.includes(urlNet) && urlNet !== network) {
      setNetwork(urlNet);
      fetchAgents(1, urlNet);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("register") === "1") setRegisterOpen(true);
  }, [searchParams]);

  useEffect(() => {
    const agent = searchParams.get("agent");
    const net = searchParams.get("network") as NetworkId | null;
    if (agent && net && NETWORK_IDS.includes(net)) {
      setPanelAgentId(agent);
      setPanelNetworkId(net);
      setPanelOpen(true);
    }
  }, [searchParams]);

  /** ⌘K focuses search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const displayedAgents = useMemo(() => {
    let result = agents;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((a) => {
        const name = (a.metadata?.name ?? "").toLowerCase();
        const desc = (a.metadata?.description ?? "").toLowerCase();
        const id = String(a.agentId).toLowerCase();
        return name.includes(q) || desc.includes(q) || id.includes(q);
      });
    }
    if (tierFilter) {
      result = result.filter((a) => computeCreditScore(a).tier === tierFilter);
    }
    if (maxCostUsdc < 10) {
      result = result.filter((a) => {
        if (!a.metadata) return false;
        const parsed = parseAgentCardServices(a.metadata as AgentCard);
        if (!parsed?.cost) return true;
        const cost = parseFloat(parsed.cost);
        return !isNaN(cost) && cost <= maxCostUsdc;
      });
    }
    if (sortBy === "score") {
      result = [...result].sort((a, b) => computeCreditScore(b).score - computeCreditScore(a).score);
    } else if (sortBy === "reviews") {
      result = [...result].sort(
        (a, b) => (b.reputation?.totalFeedback ?? 0) - (a.reputation?.totalFeedback ?? 0)
      );
    } else if (sortBy === "rating") {
      result = [...result].sort(
        (a, b) => (b.reputation?.averageScore ?? 0) - (a.reputation?.averageScore ?? 0)
      );
    }
    return result;
  }, [agents, searchQuery, tierFilter, maxCostUsdc, sortBy]);

  const displayedAgentIds = useMemo(
    () => displayedAgents.map((a) => a.agentId).filter(Boolean).join(","),
    [displayedAgents]
  );

  useEffect(() => {
    if (!displayedAgentIds) {
      setHealthMap({});
      return;
    }
    let cancelled = false;
    fetch(`/api/agents/health-batch?ids=${displayedAgentIds}&network=${network}`)
      .then((r) => r.json())
      .then((map: Record<string, HealthStatus>) => {
        if (!cancelled) setHealthMap(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [displayedAgentIds, network]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const syncShowingAndFetch = (preset: ShowingPreset) => {
    const { tier, x402 } = presetToState(preset);
    setTierFilter(tier);
    if (x402 !== x402Only) {
      setX402Only(x402);
      fetchAgents(1, network);
    } else {
      setX402Only(x402);
    }
  };

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 py-6 lg:flex-row lg:gap-10 lg:px-6">
      {/* Main column */}
      <div className="min-w-0 flex-1 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1
              className="text-xl font-bold uppercase tracking-[0.2em] text-[#f5d96a] md:text-2xl"
              style={{ fontFamily: CINZEL }}
            >
              Discover agents
            </h1>
            <p className="mt-1.5 text-sm text-[#a89060]">
              Registered agents and data artifacts on the network.
              {!isLoading && total > 0 && (
                <span className="ml-1 font-medium text-[#e8dcc8]">
                  {total} agent{total !== 1 ? "s" : ""} indexed.
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchAgents(currentPage, network)}
              disabled={isLoading}
              title="Refresh"
              className="rounded border border-[rgba(168,144,96,0.25)] p-2 text-[#a89060] transition-colors hover:bg-[rgba(245,217,106,0.06)] hover:text-[#f5d96a] disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a89060]/70" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents…"
                className={cn(
                  "h-10 w-full min-w-0 rounded-md border border-[rgba(168,144,96,0.22)] bg-[#120d06] pl-9 pr-16 font-mono text-sm text-[#e8dcc8] shadow-xs placeholder:text-[#a89060]/60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d96a]/30"
                )}
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-[rgba(168,144,96,0.25)] bg-[#1a1208] px-1.5 py-0.5 font-mono text-[10px] text-[#a89060] sm:inline-block">
                ⌘K
              </kbd>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={network}
                onChange={(e) => handleNetworkChange(e.target.value)}
                className="h-10 min-w-[140px] rounded-md border border-[rgba(168,144,96,0.22)] bg-[#120d06] px-3 text-sm text-[#e8dcc8] focus:outline-none focus:ring-2 focus:ring-[#f5d96a]/30"
              >
                {NETWORK_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>

              <select
                value={x402Only ? "x402" : tierFilter ?? "all"}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "all") syncShowingAndFetch("all");
                  else if (val === "x402") syncShowingAndFetch("x402");
                  else if (ALL_TIERS.includes(val as CreditTier)) {
                    const wasX402 = x402Only;
                    setTierFilter(val as CreditTier);
                    setX402Only(false);
                    if (wasX402) fetchAgents(1, network);
                  }
                }}
                className="h-10 min-w-[160px] rounded-md border border-[rgba(168,144,96,0.22)] bg-[#120d06] px-3 text-sm text-[#e8dcc8] focus:outline-none focus:ring-2 focus:ring-[#f5d96a]/30"
              >
                <option value="all">Showing all</option>
                <option value="x402">x402 only</option>
                {ALL_TIERS.map((t) => (
                  <option key={t} value={t}>
                    Credit: {TIER_LABELS[t]}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="h-10 min-w-[150px] rounded-md border border-[rgba(168,144,96,0.22)] bg-[#120d06] px-3 text-sm text-[#e8dcc8] focus:outline-none focus:ring-2 focus:ring-[#f5d96a]/30"
              >
                <option value="default">Sort: newest</option>
                <option value="score">Sort: credit score</option>
                <option value="reviews">Sort: reviews</option>
                <option value="rating">Sort: rating</option>
              </select>

              <div className="flex rounded-md border border-[rgba(168,144,96,0.22)] bg-[#0f0a05] p-0.5">
                <button
                  type="button"
                  title="List view"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "rounded px-2.5 py-1.5 transition-colors",
                    viewMode === "list"
                      ? "bg-[rgba(245,217,106,0.12)] text-[#f5d96a]"
                      : "text-[#a89060] hover:text-[#e8dcc8]"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Grid view"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "rounded px-2.5 py-1.5 transition-colors",
                    viewMode === "grid"
                      ? "bg-[rgba(245,217,106,0.12)] text-[#f5d96a]"
                      : "text-[#a89060] hover:text-[#e8dcc8]"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setRegisterOpen(true)}
                className="h-10 whitespace-nowrap rounded-md border border-[rgba(245,217,106,0.3)] bg-[rgba(245,217,106,0.08)] px-4 text-sm font-medium text-[#f5d96a] transition-colors hover:border-[rgba(245,217,106,0.5)] hover:bg-[rgba(245,217,106,0.15)]"
                style={{ fontFamily: CINZEL }}
              >
                Register Agent
              </button>

              <Link
                href="/docs"
                className="inline-flex h-10 items-center rounded-md border border-[rgba(168,144,96,0.25)] px-3 text-sm text-[#a89060] transition-colors hover:border-[rgba(245,217,106,0.35)] hover:text-[#e8dcc8]"
              >
                Learn more
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-xs text-[#a89060]">
              Max cost: {maxCostUsdc === 10 ? "any" : `${maxCostUsdc.toFixed(2)} USDC`}
            </span>
            <Slider
              value={[maxCostUsdc]}
              onValueChange={(v) => setMaxCostUsdc(v[0])}
              min={0}
              max={10}
              step={0.1}
              className="max-w-md flex-1"
            />
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-[rgba(200,60,60,0.3)] bg-[rgba(200,60,60,0.04)] py-16 text-center"
            >
              <p className="text-sm text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => fetchAgents(currentPage, network)}
                className="mt-4 rounded border border-[rgba(168,144,96,0.3)] px-4 py-1.5 text-xs text-[#a89060] transition-colors hover:border-[rgba(245,217,106,0.4)] hover:text-[#f5d96a]"
              >
                Retry
              </button>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <AgentCardSkeleton key={i} />
              ))}
            </motion.div>
          ) : displayedAgents.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-dashed border-[rgba(168,144,96,0.2)] bg-[rgba(168,144,96,0.02)] py-16 text-center"
            >
              <p className="text-sm text-[#a89060]">No agents match your filters.</p>
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div
              key="grid"
              layout
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
            >
              <AnimatePresence mode="popLayout">
                {displayedAgents.map((agent) => (
                  <motion.div
                    key={agent.id}
                    layout
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <RegistryAgentCard
                      agent={agent}
                      compact
                      healthMap={healthMap}
                      onAgentClick={() => {
                        setPanelAgentId(agent.agentId);
                        setPanelNetworkId(agent.networkId ?? network);
                        setPanelOpen(true);
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-hidden rounded-lg border border-[rgba(168,144,96,0.18)] bg-[#120d06]"
            >
              {/* Table header */}
              <div className="hidden grid-cols-[minmax(180px,1.1fr)_minmax(200px,2fr)_minmax(160px,1.2fr)_auto] gap-3 border-b border-[rgba(168,144,96,0.12)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#a89060]/80 md:grid">
                <span>Provider</span>
                <span>Description</span>
                <span className="font-mono">Service URL</span>
                <span className="w-24 text-right" />
              </div>

              <div className="divide-y divide-[rgba(168,144,96,0.1)]">
                {displayedAgents.map((agent) => {
                  const name = agent.metadata?.name ?? `Agent #${agent.agentId}`;
                  const rawDesc = agent.metadata?.description;
                  const description = rawDesc ? formatDescription(rawDesc) : "—";
                  const serviceUrl = primaryServiceUrl(agent) || "—";
                  const netId = agent.networkId ?? network;
                  const cs = computeCreditScore(agent);
                  const tierLabel = TIER_LABELS[cs.tier];
                  const protocols = agent.protocols?.length
                    ? agent.protocols.join(" · ")
                    : "Agent";
                  const expanded = expandedIds.has(agent.id);
                  const endpoints = extractEndpoints(agent);
                  const imageToTry = resolveAgentImage(agent.agentId, agent.metadata?.image);
                  const [imgError, setImgError] = useState(false);
                  // imgError can't be in map - need subcomponent

                  return (
                    <AgentListRow
                      key={agent.id}
                      agent={agent}
                      name={name}
                      description={description}
                      serviceUrl={serviceUrl}
                      networkId={netId}
                      tierLabel={tierLabel}
                      protocols={protocols}
                      expanded={expanded}
                      endpoints={endpoints}
                      healthMap={healthMap}
                      imageToTry={imageToTry}
                      onToggle={() => toggleExpanded(agent.id)}
                      onOpenPanel={() => {
                        setPanelAgentId(agent.agentId);
                        setPanelNetworkId(netId);
                        setPanelOpen(true);
                      }}
                      onCopy={copyText}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {!isLoading && !error && displayedAgents.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#a89060]">
              Page {currentPage} · showing {displayedAgents.length} of {total} (this page)
            </p>
            <div className="flex items-center gap-2">
              {[
                {
                  label: "← Previous",
                  disabled: currentPage === 1 || isLoading,
                  onClick: () => fetchAgents(currentPage - 1, network),
                },
                {
                  label: "Next →",
                  disabled: !hasMore || isLoading,
                  onClick: () => fetchAgents(currentPage + 1, network),
                },
              ].map(({ label, disabled, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  disabled={disabled}
                  className="rounded border border-[rgba(168,144,96,0.25)] px-3 py-1.5 text-xs text-[#a89060] transition-colors hover:border-[rgba(245,217,106,0.4)] hover:text-[#f5d96a] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Guide sidebar */}
      <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-6 lg:w-72 lg:self-start xl:w-80">
        <div className="rounded-xl border border-[rgba(168,144,96,0.18)] bg-[#120d06] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#f5d96a]" style={{ fontFamily: CINZEL }}>
            Use with agents
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-[#a89060]">
            Pay-per-call agents use the x402 protocol. Fetch an agent card from its registry URI, then call the listed
            endpoint with an <code className="text-[#e8dcc8]">X-Payment</code> header once payment is settled.
          </p>

          <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-[#a89060]/80">Example request</p>
          <div className="relative mt-2 rounded-lg border border-[rgba(168,144,96,0.15)] bg-[#1a1208] p-3 font-mono text-[10px] leading-relaxed text-[#c8b890]">
            <button
              type="button"
              title="Copy"
              onClick={() =>
                copyText(`curl -X POST "$AGENT_ENDPOINT" \\
  -H "Content-Type: application/json" \\
  -H "X-Payment: $PAYMENT_PAYLOAD" \\
  -d '{"prompt":"..."}'`)
              }
              className="absolute right-2 top-2 rounded border border-[rgba(168,144,96,0.2)] px-1.5 py-0.5 text-[9px] text-[#a89060] hover:text-[#f5d96a]"
            >
              Copy
            </button>
            <pre className="overflow-x-auto pr-12 whitespace-pre-wrap break-all">
{`curl -X POST "$AGENT_ENDPOINT" \\
  -H "Content-Type: application/json" \\
  -H "X-Payment: $PAYMENT_PAYLOAD" \\
  -d '{"prompt":"..."}'`}
            </pre>
          </div>

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-[#a89060]/80">Prompt your agent</p>
          <div className="relative mt-2 rounded-lg border border-[rgba(168,144,96,0.15)] bg-[#1a1208] p-3 font-mono text-[10px] leading-relaxed text-[#c8b890]">
            <button
              type="button"
              title="Copy"
              onClick={() =>
                copyText(
                  `Use the agent at SERVICE_URL with x402. Summarize the latest block headers for ${NETWORKS[network].name}.`
                )
              }
              className="absolute right-2 top-2 rounded border border-[rgba(168,144,96,0.2)] px-1.5 py-0.5 text-[9px] text-[#a89060] hover:text-[#f5d96a]"
            >
              Copy
            </button>
            <pre className="overflow-x-auto pr-12 whitespace-pre-wrap">
              {`Use the agent at SERVICE_URL with x402.\nSummarize the latest block headers for ${NETWORKS[network].name}.`}
            </pre>
          </div>
        </div>

        <Link
          href="/docs"
          className="flex items-center gap-3 rounded-xl border border-[rgba(168,144,96,0.18)] bg-[#0f0a05] p-4 transition-colors hover:border-[rgba(245,217,106,0.25)] hover:bg-[rgba(245,217,106,0.04)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(168,144,96,0.2)] bg-[#1a1208] font-mono text-xs text-[#f5d96a]">
            .txt
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#e8dcc8]">llms.txt</p>
            <p className="text-xs text-[#a89060]">Service discovery &amp; agent docs</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#a89060]" />
        </Link>
      </aside>

      <RegisterAgentDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onSuccess={() => fetchAgents(1, network)}
      />
      <AgentDetailPanel
        agentId={panelAgentId}
        networkId={panelNetworkId}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        agentRows={[]}
      />
    </div>
  );
}

function AgentListRow({
  agent,
  name,
  description,
  serviceUrl,
  networkId,
  tierLabel,
  protocols,
  expanded,
  endpoints,
  healthMap,
  imageToTry,
  onToggle,
  onOpenPanel,
  onCopy,
}: {
  agent: RegistryAgent;
  name: string;
  description: string;
  serviceUrl: string;
  networkId: NetworkId;
  tierLabel: string;
  protocols: string;
  expanded: boolean;
  endpoints: EndpointRow[];
  healthMap: Record<string, HealthStatus>;
  imageToTry: string | null;
  onToggle: () => void;
  onOpenPanel: () => void;
  onCopy: (t: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const resolvedImg =
    imageToTry && !imgError
      ? imageToTry.startsWith("ipfs://")
        ? imageToTry.replace("ipfs://", "https://ipfs.io/ipfs/")
        : imageToTry
      : null;

  const urlForOpen = serviceUrl !== "—" && serviceUrl.startsWith("http") ? serviceUrl : undefined;

  return (
    <div className="bg-[#0a0804]/40">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="grid cursor-pointer grid-cols-1 gap-3 px-4 py-3.5 transition-colors hover:bg-[rgba(245,217,106,0.03)] md:grid-cols-[minmax(180px,1.1fr)_minmax(200px,2fr)_minmax(160px,1.2fr)_auto] md:items-center"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-[rgba(168,144,96,0.2)] bg-[#1a1208]">
            {resolvedImg ? (
              <img
                src={resolvedImg}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <img src={agentInitialsSvg(agent.id, name)} alt="" className="h-full w-full object-cover" draggable={false} />
            )}
            <HealthDot agentId={agent.agentId} networkId={networkId} status={healthMap?.[agent.agentId]} />
          </div>
          <div className="min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPanel();
              }}
              className="text-left font-semibold text-[#e8dcc8] hover:text-[#f5d96a] hover:underline"
            >
              {name}
            </button>
            <p className="text-[10px] uppercase tracking-wide text-[#a89060]/90">{tierLabel}</p>
            <p className="mt-0.5 text-[10px] text-[#a89060]/70">{protocols}</p>
          </div>
        </div>

        <p className="line-clamp-2 text-sm text-[#a89060] md:line-clamp-3">{description}</p>

        <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-[#c8b890]">
          <span className="truncate rounded-md border border-[rgba(168,144,96,0.15)] bg-[#1a1208] px-2 py-1">
            {serviceUrl === "—" ? "—" : serviceUrl.length > 48 ? `${serviceUrl.slice(0, 46)}…` : serviceUrl}
          </span>
        </div>

        <div className="flex items-center justify-end gap-1 md:w-24">
          <button
            type="button"
            title="Copy URL"
            onClick={(e) => {
              e.stopPropagation();
              if (serviceUrl !== "—") onCopy(serviceUrl);
            }}
            className="rounded p-1.5 text-[#a89060] hover:bg-[rgba(245,217,106,0.08)] hover:text-[#f5d96a]"
          >
            <Copy className="h-4 w-4" />
          </button>
          {urlForOpen && (
            <a
              href={urlForOpen}
              target="_blank"
              rel="noopener noreferrer"
              title="Open"
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1.5 text-[#a89060] hover:bg-[rgba(245,217,106,0.08)] hover:text-[#f5d96a]"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <span className="p-1.5 text-[#a89060]">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[rgba(168,144,96,0.08)] bg-[#0a0804]/60"
          >
            <div className="px-4 py-2">
              {endpoints.length === 0 ? (
                <p className="py-2 text-xs text-[#a89060]">No endpoint details in agent card.</p>
              ) : (
                <div className="space-y-0">
                  <div className="hidden grid-cols-[100px_1fr_80px] gap-3 border-b border-[rgba(168,144,96,0.08)] py-2 text-[9px] font-semibold uppercase tracking-wider text-[#a89060]/70 sm:grid">
                    <span>Endpoint</span>
                    <span>Description</span>
                    <span className="text-right">Price</span>
                  </div>
                  {endpoints.map((ep, i) => (
                    <div
                      key={`${ep.path}-${i}`}
                      className="grid grid-cols-1 gap-2 border-b border-[rgba(168,144,96,0.06)] py-3 last:border-0 sm:grid-cols-[100px_1fr_80px] sm:items-center sm:gap-3"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                            ep.method === "GET"
                              ? "bg-[rgba(16,185,129,0.12)] text-emerald-400"
                              : "bg-[rgba(167,139,250,0.15)] text-[#a78bfa]"
                          )}
                        >
                          {ep.method}
                        </span>
                        <span className="font-mono text-[11px] text-[#e8dcc8]">{ep.path}</span>
                        <span className="rounded border border-[rgba(168,144,96,0.2)] px-1 py-0.5 text-[9px] text-[#a89060]">
                          Charge
                        </span>
                      </div>
                      <p className="text-xs text-[#a89060]">{ep.description}</p>
                      <p className="text-right font-mono text-xs font-medium text-[#e8dcc8] sm:text-sm">{ep.price}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
