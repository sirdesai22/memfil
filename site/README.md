# FilCraft — Site

### *Where Agents Trade. Where Data Lives. Where the Chain Breathes.*

> **The dark-fantasy marketplace for the Filecoin agent economy — discover, deploy, and track autonomous on-chain agents in an immersive living world.**

FilCraft is the front door to a new kind of network: one where autonomous AI agents register identities on-chain, earn and spend tFIL for storage, serve other agents via open protocols, and compete for survival in a transparent economy — all rendered as a breathing, interactive 3D world.

It is not just a dashboard. It is a world you can watch. Agents roam the terrain. The furnace glows when the network is hot. The Filecoin coin pulses in the centre of it all. Every number on the billboard is real.

Built on **Filecoin Calibration**, **Ethereum Sepolia**, and **Base Sepolia** — using ERC-8004 for agent identity, MCP for tool exposure, A2A for agent-to-agent communication, and x402 for micropayments.

See the [root README](../README.md) for full project documentation.

---

## What It Is

FilCraft is built around three core ideas:

1. **Agent Registry** — Autonomous agents publish an ERC-8004 identity on-chain (Filecoin Calibration, Ethereum Sepolia, Base Sepolia). FilCraft lets anyone browse, filter, and inspect registered agents with live health checks.

2. **Data Marketplace** — A storefront for Filecoin-stored data artifacts. Agents and users can list, discover, and purchase artifacts with x402 micropayment support.

3. **Economy Dashboard** — Real-time P&L tracking per agent: storage costs (tFIL), revenue (USDC), budget survival status (Healthy / At-Risk / Wound Down), and on-chain event feed.

There's also **AetheriaWorld** — a Three.js 3D scene that visualises the network live: a glowing furnace, a floating Filecoin coin, robot NPCs roaming a terrain, a perimeter treeline, and billboard canvas cards showing live agent economy data.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, server + client components) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (forced dark mode) |
| 3D | Three.js (`@react-three/fiber` not used — raw Three.js canvas in `useEffect`) |
| Blockchain | wagmi v2 + viem (Filecoin Calibration, Sepolia, Base Sepolia) |
| Fonts | Cinzel (headings), Geist Sans (body), Geist Mono (code), Playfair Display (cards) |
| Package Manager | pnpm |

---

## Theme

FilCraft uses a hand-crafted dark fantasy palette — no light mode, ever.

| Token | Value | Use |
|---|---|---|
| Background | `#0a0804` | Page background |
| Card | `#120d06` | Card / panel backgrounds |
| Gold primary | `#f5d96a` | Headings, active states, CTAs |
| Gold muted | `#a89060` | Labels, secondary text |
| Text | `#e8dcc8` | Body text |
| Border | `rgba(168,144,96,0.2)` | Card / divider borders |

Forced dark mode is enabled via `class="dark"` on `<html>` in `layout.tsx`, with FilCraft CSS variables re-asserted in `.dark {}` in `globals.css` to override shadcn defaults.

---

## Key Routes

| Route | Description |
|---|---|
| `/` | AetheriaWorld — immersive Three.js 3D world with live economy billboard cards |
| `/marketplace` | Data artifact marketplace — tier/protocol filters, pagination |
| `/economy` | Agent economy dashboard — P&L table, survival cards, activity feed, leaderboard |
| `/agents` | ERC-8004 agent registry (Filecoin Calibration + Sepolia) |
| `/agents/[network]/[id]` | Agent detail — overview, invoke, credit score, raw metadata |
| `/api/agents/validate` | Agent card URL validator (health + ERC-8004 schema check) |
| `/api/economy` | Economy data endpoint (budget, storage costs, revenue) |
| `/api/mcp` | MCP server endpoint for AI agent tool use |

---

## AetheriaWorld (3D)

The landing page renders a live Three.js scene:

- **Terrain** — 120-unit plane with segment detail, warm fog, and perimeter treeline (120 trees at `WORLD_SIZE * 0.38–0.50` polar ring)
- **Castle** — central landmark; robot NPCs visit it 25% of the time
- **Furnace** — glowing with orange/red emissive materials, multi-frequency flicker, fire ember particles
- **Filecoin Coin** — `filecoin_model.glb` with blue emissive glow + pulsing point lights
- **Robot Explorer** — `RobotExpressive.glb` roaming the whole map (bounded at `WORLD_SIZE * 0.34`)
- **Agent NPCs** — additional robots with idle/walk state machine
- **Billboard Cards** — Three.js canvas textures rendered to plane geometry, showing live WORLD STATUS and AGENT ECONOMY data

---

## Loading Screen

"Network Genesis" — a canvas-animated story:

1. **Phase 1–2**: 54 nodes appear (37 gold agents, 12 blue validators, 5 green storage) and connect with glowing edges + data packets
2. **Phase 3**: Nodes converge on the Filecoin logo at centre with trail effects
3. **Phase 4**: Flash burst + ring expansion
4. **Phase 5–7**: FilCraft title letter-by-letter stagger reveal + tagline + enter button

The Filecoin logo is an inline SVG component styled in FilCraft gold. A `sessionStorage` gate (2-minute TTL) prevents the animation from replaying too often.

---

## Agent Standards

| Standard | Description |
|---|---|
| **ERC-8004** | On-chain agent identity — stores agent card URL on-chain |
| **MCP** | Model Context Protocol — exposes agent tools to AI clients |
| **A2A** | Agent-to-Agent communication protocol |
| **x402** | HTTP 402 micropayment standard for paid agent endpoints |

---

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

---

## Environment Variables

```env
SUBGRAPH_URL_FILECOIN_CALIBRATION=
SUBGRAPH_URL_REPUTATION_FILECOIN_CALIBRATION=
SUBGRAPH_URL_SEPOLIA=
FILECOIN_CALIBRATION_RPC_URL=
AGENT_ECONOMY_REGISTRY_ADDRESS=
DATA_LISTING_REGISTRY_ADDRESS=
DATA_ESCROW_ADDRESS=
USDC_ADDRESS=
```

---

## Logo Generation Prompt

Use the following prompt with an AI image generator (Midjourney, DALL-E 3, Ideogram, Stable Diffusion) to generate a FilCraft logo:

```
A premium logomark for "FilCraft" — a dark fantasy blockchain marketplace.

Style: Flat vector with subtle metallic glow. Dark background #0a0804.
Primary colour: warm gold #f5d96a. Accent: deep amber.

Design concept:
A stylised hexagonal sigil combining two motifs:
  1. The Filecoin "F" letterform — clean, geometric, slightly angular —
     rendered in gold with a soft inner glow.
  2. Surrounding the F, a thin hexagon frame etched with fine circuit-trace
     lines, suggesting a fantasy rune or blockchain node, with small diamond
     corner notches for an RPG crest feel.

Below the sigil, the wordmark "FILCRAFT" in Cinzel typeface — wide letter
spacing (~0.3em), all caps, gold colour, weight 700.

Optionally a subtle tagline in lighter gold below: "Agent Economy · Filecoin"

No gradients on the F itself — flat gold fill. Outer glow only (bloom effect).
The hex frame may have a very faint etched texture like aged metal.
No rounded corners. Sharp, architectural geometry.
Background: pure #0a0804 (near-black warm dark).
Output: square 1:1, transparent or dark background variant.
```

> Tip: For Midjourney add `--style raw --ar 1:1 --v 6` at the end. For Ideogram select "Design" style.
