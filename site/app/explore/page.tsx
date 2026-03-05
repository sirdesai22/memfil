"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Copy, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SkillEntry, SkillsTab } from "@/app/api/skills/route";

const TAB_OPTIONS: { id: SkillsTab; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "trending", label: "Trending" },
  { id: "hot", label: "Hot" },
];

// ── Rarity tiers by rank ────────────────────────────────────────────────────

type Rarity = "legendary" | "epic" | "rare" | "common";

interface RarityStyle {
  label: string;
  bg: string;
  border: string;
  glow: string;
  accent: string;
  dim: string;
  rankBg: string;
}

const RARITY_STYLES: Record<Rarity, RarityStyle> = {
  legendary: {
    label: "Legendary",
    bg:     "linear-gradient(160deg, #1c1200 0%, #2e1f00 40%, #1c1200 100%)",
    border: "#c9a227",
    glow:   "rgba(201,162,39,0.45)",
    accent: "#f0c040",
    dim:    "#a07820",
    rankBg: "rgba(201,162,39,0.2)",
  },
  epic: {
    label: "Epic",
    bg:     "linear-gradient(160deg, #0f0018 0%, #1c0030 40%, #0f0018 100%)",
    border: "#9d4dca",
    glow:   "rgba(157,77,202,0.4)",
    accent: "#c084fc",
    dim:    "#7c3aaf",
    rankBg: "rgba(157,77,202,0.2)",
  },
  rare: {
    label: "Rare",
    bg:     "linear-gradient(160deg, #001018 0%, #001830 40%, #001018 100%)",
    border: "#3b82f6",
    glow:   "rgba(59,130,246,0.35)",
    accent: "#60a5fa",
    dim:    "#2563b8",
    rankBg: "rgba(59,130,246,0.2)",
  },
  common: {
    label: "Common",
    bg:     "linear-gradient(160deg, #0a0a0a 0%, #141414 40%, #0a0a0a 100%)",
    border: "#3f3f46",
    glow:   "rgba(63,63,70,0.3)",
    accent: "#a1a1aa",
    dim:    "#52525b",
    rankBg: "rgba(63,63,70,0.2)",
  },
};

function getRarity(rank: number): Rarity {
  if (rank <= 3) return "legendary";
  if (rank <= 6) return "epic";
  if (rank <= 10) return "rare";
  return "common";
}

// ── Weapon assignment ───────────────────────────────────────────────────────

const WEAPON_POOL = ["⚔️", "🗡️", "🪄", "🏹", "🔱", "🔮", "📜", "⚒️"];

function getWeapon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("find") || n.includes("search") || n.includes("scout")) return "🏹";
  if (n.includes("guide") || n.includes("best") || n.includes("rules") || n.includes("practice")) return "📜";
  if (n.includes("react") || n.includes("vue") || n.includes("angular") || n.includes("ui") || n.includes("frontend")) return "🔮";
  if (n.includes("api") || n.includes("fetch") || n.includes("http") || n.includes("request")) return "🗡️";
  if (n.includes("test") || n.includes("lint") || n.includes("safe") || n.includes("check")) return "🛡️";
  if (n.includes("build") || n.includes("deploy") || n.includes("pack") || n.includes("compile")) return "⚒️";
  if (n.includes("ai") || n.includes("llm") || n.includes("model") || n.includes("gpt") || n.includes("agent")) return "✨";
  if (n.includes("data") || n.includes("db") || n.includes("sql") || n.includes("store")) return "🔱";
  if (n.includes("remotion") || n.includes("video") || n.includes("animate")) return "🪄";
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return WEAPON_POOL[hash % WEAPON_POOL.length];
}

// ── Weapon card ─────────────────────────────────────────────────────────────

function WeaponCard({
  skill,
  index,
  onCopy,
  copied,
}: {
  skill: SkillEntry;
  index: number;
  onCopy: (skill: SkillEntry) => void;
  copied: boolean;
}) {
  const rarity = getRarity(skill.rank);
  const r = RARITY_STYLES[rarity];
  const weapon = getWeapon(skill.name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <div
        className="group relative flex flex-col overflow-hidden rounded-sm transition-all duration-300 hover:-translate-y-1"
        style={{
          background: r.bg,
          border: `1px solid ${r.border}`,
          boxShadow: `0 0 16px ${r.glow}, 0 4px 24px rgba(0,0,0,0.6)`,
          minHeight: "220px",
        }}
      >
        {/* Top bar: rarity label + rank */}
        <div
          className="flex items-center justify-between px-3 py-1.5"
          style={{ borderBottom: `1px solid ${r.border}22` }}
        >
          <span
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: r.accent }}
          >
            {r.label}
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: r.rankBg, color: r.accent }}
          >
            #{skill.rank}
          </span>
        </div>

        {/* Weapon icon */}
        <div className="flex flex-1 items-center justify-center py-4">
          <span
            className="select-none transition-transform duration-300 group-hover:scale-110"
            style={{ fontSize: "3rem", filter: "drop-shadow(0 0 12px rgba(255,255,255,0.15))" }}
          >
            {weapon}
          </span>
        </div>

        {/* Skill name */}
        <div className="px-3 pb-1 text-center">
          <p
            className="truncate font-mono text-sm font-bold leading-tight"
            style={{ color: r.accent, fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {skill.name}
          </p>
          <p
            className="truncate text-[11px] font-mono mt-0.5"
            style={{ color: r.dim }}
          >
            {skill.owner}/{skill.repo}
          </p>
        </div>

        {/* Divider */}
        <div
          className="mx-3 my-2 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${r.border}, transparent)` }}
        />

        {/* Stats + actions footer */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: r.dim }}>
              Power
            </p>
            <p className="text-sm font-bold" style={{ color: r.accent }}>
              {skill.installs}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCopy(skill)}
              className="flex h-7 w-7 items-center justify-center rounded transition-colors"
              style={{
                background: r.rankBg,
                border: `1px solid ${r.border}44`,
                color: copied ? "#4ade80" : r.accent,
              }}
              title="Copy install command"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={skill.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded transition-colors"
              style={{
                background: r.rankBg,
                border: `1px solid ${r.border}44`,
                color: r.dim,
              }}
              title="View on skills.sh"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [tab, setTab] = useState<SkillsTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/skills?tab=${tab}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSkills(d.skills ?? []);
        else setError(d.error ?? "Failed to load");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  const filteredSkills = searchQuery
    ? skills.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${s.owner}/${s.repo}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : skills;

  const handleCopy = (skill: SkillEntry) => {
    const cmd = `npx skills add https://github.com/${skill.owner}/${skill.repo} --skill ${skill.name}`;
    navigator.clipboard.writeText(cmd);
    setCopiedUrl(skill.url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="container space-y-8 px-4 py-8 md:px-6">
      {/* Header */}
      <div>
        <h1
          className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          style={{ fontFamily: "var(--font-playfair-display), serif" }}
        >
          Agent Skills
        </h1>
        <p className="mt-2 text-muted-foreground">
          Equip your agents with powerful abilities. Each skill is a weapon in your arsenal.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-sm">
          <code className="flex-1">npx skills add</code>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => navigator.clipboard.writeText("npx skills add")}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Rarity legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(RARITY_STYLES) as [Rarity, RarityStyle][]).map(([key, r]) => (
          <span
            key={key}
            className="rounded-full px-3 py-0.5 text-xs font-semibold"
            style={{ background: r.rankBg, color: r.accent, border: `1px solid ${r.border}44` }}
          >
            {r.label} {key === "legendary" ? "· Top 3" : key === "epic" ? "· 4–6" : key === "rare" ? "· 7–10" : "· 11+"}
          </span>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {TAB_OPTIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary md:w-64"
          />
        </div>
      </div>

      {/* Weapon grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-destructive">{error}</div>
      ) : filteredSkills.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No skills found.</div>
      ) : (
        <motion.div
          layout
          className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          <AnimatePresence mode="popLayout">
            {filteredSkills.map((skill, i) => (
              <WeaponCard
                key={skill.url}
                skill={skill}
                index={i}
                onCopy={handleCopy}
                copied={copiedUrl === skill.url}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Data from{" "}
        <a
          href="https://skills.sh"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          skills.sh
        </a>
        {" "}— the open agent skills ecosystem.
      </p>
    </div>
  );
}
