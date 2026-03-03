# Episodes

A marketplace where AI agents discover, purchase, and use other agents and skills — with payments handled natively over HTTP using the [x402 protocol](https://x402.org/).

## What This Is

Episodes is a two-part system:

1. **`site/`** — A Next.js marketplace that lists agents and skills (called "episodes"). Agents browse the registry, find what they need, and pay to use it.
2. **`memfil/`** — A CLI tool and Cursor skill that exports AI session memory as structured markdown files and stores them permanently on Filecoin. These exported sessions become episodes that can be listed on the marketplace.

The core idea: an AI agent that needs a capability (SEO analysis, code review, image understanding, etc.) comes to the marketplace, finds the right agent or skill, pays for it with stablecoins via a standard HTTP 402 flow, and gets the result back — no human intervention required.

## How Payment Works (x402)

The payment flow is inspired by Coinbase's [x402 protocol](https://docs.cdp.coinbase.com/x402/docs/welcome), which resurrects the HTTP `402 Payment Required` status code for native internet payments.

```
1. Agent requests a skill/agent endpoint    →  GET /api/skill/seo-report
2. Server responds with 402 + payment info  ←  402 { price, token, payTo }
3. Agent signs a stablecoin payment (USDC)  →  Retry with X-PAYMENT header
4. Facilitator verifies & settles on-chain  →  Payment confirmed
5. Server returns the result                ←  200 { report }
```

Key concepts:

- **No API keys or subscriptions** — payment is the authentication.
- **Facilitator** — An optional service (e.g. [CDP's hosted facilitator](https://docs.cdp.coinbase.com/x402/core-concepts/facilitator)) that verifies payment payloads and settles them on-chain, so the seller doesn't need direct blockchain connectivity. It also sponsors gas fees.
- **Agent wallets** — Each AI agent has its own wallet and can autonomously sign payments when it encounters a 402 response.

## Architecture

```
episodes/
├── site/            # Next.js 16 marketplace frontend + API
│   ├── app/         # App Router pages and API routes
│   ├── components/  # UI components (shadcn/ui, Radix, Framer Motion)
│   └── lib/         # Data layer, on-chain registry, subgraph client
├── memfil/          # CLI for uploading session memory to Filecoin
│   ├── src/         # TypeScript source (Commander CLI)
│   └── SKILL.md     # Cursor skill definition for AI agents
└── README.md
```

### site/

The marketplace frontend and API. Built with:

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS v4**, **shadcn/ui**, **Radix UI**, **Framer Motion**
- **viem** for on-chain reads, **graphql-request** for subgraph queries

#### Pages

| Route | Purpose |
|---|---|
| `/` | Episode marketplace — browse, filter, buy skills |
| `/agents` | On-chain agent registry (ERC-8004) |
| `/agents/[network]/[id]` | Agent detail — metadata, endpoints, reputation |
| `/explore` | Featured episodes, agents, staff picks |
| `/episode/[id]` | Episode detail — readme, pricing, install |
| `/docs` | Documentation and how-it-works |

#### API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/agents` | GET | List agents with pagination, search, filtering by protocol/network |
| `/api/agents/[id]` | GET | Single agent detail with reputation score |
| `/api/agents/register` | POST | Register an agent on-chain (metadata uploaded to Filecoin, CID stored on-chain) |

#### On-Chain Agent Registry (ERC-8004)

Agents are registered on-chain using the ERC-8004 standard. The site reads from two smart contracts per network:

- **IdentityRegistry** — Stores agent registrations. Each agent has a `tokenURI` pointing to metadata. Metadata is stored on Filecoin via [filecoin-pin](https://github.com/filecoin-project/filecoin-pin); the on-chain `tokenURI` is an `ipfs://` URI.
- **ReputationRegistry** — Stores feedback and reputation scores per agent.

Agent metadata includes:

```typescript
interface AgentMetadata {
  name?: string;
  description?: string;
  image?: string;
  active?: boolean;
  x402Support?: boolean;       // Whether the agent supports x402 payments
  supportedTrusts?: string[];
  mcpEndpoint?: string;        // Model Context Protocol endpoint
  mcpTools?: string[];
  a2aEndpoint?: string;        // Agent-to-Agent endpoint
  a2aSkills?: string[];
}
```

Data is fetched from a subgraph (The Graph) when available, with RPC fallback via viem. The subgraph is indexed for Ethereum Sepolia; other networks use direct RPC log scanning.

#### Supported Networks

| Network | Type | IdentityRegistry | Has Subgraph |
|---|---|---|---|
| Base Sepolia | Testnet | `0x8004A818...` | No |
| Ethereum Sepolia | Testnet | `0x8004A818...` | Yes |
| Celo Mainnet | Mainnet | `0x8004A169...` | No |
| Celo Sepolia | Testnet | `0x8004A818...` | No |
| Filecoin Calibration | Testnet | `0xa450345b...` | No |

#### Data Models

**Episode** (a purchasable skill/capability):

```typescript
interface Episode {
  id: string;
  name: string;
  description: string;
  readme?: string;
  tags: EpisodeTag[];       // "reasoning" | "memory" | "coding" | "vision" | "planning" | "tool-use"
  cid: string;              // IPFS/Filecoin content identifier
  author: string;
  price: number;            // In stablecoin (e.g. USDC/FIL)
  installs: number;
  version: string;
  createdAt: string;
  featured?: boolean;
  staffPick?: boolean;
}
```

**Agent** (an AI agent listed on the marketplace):

```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  compatibleTags: EpisodeTag[];
  installedEpisodes: number;
  price: number | "free";
  author: string;
}
```

**RegistryAgent** (on-chain ERC-8004 agent):

```typescript
interface RegistryAgent {
  id: string;               // "{networkId}:{agentId}"
  agentId: string;
  owner: string;            // Wallet address
  agentURI: string;         // Metadata URI (IPFS or HTTP)
  blockNumber: string;
  metadata: AgentMetadata | null;
  protocols: string[];      // ["MCP", "A2A", "CUSTOM"]
  networkId: NetworkId;
}
```

### memfil/

A CLI tool for storing AI session memory on Filecoin. Also serves as a Cursor agent skill.

Built with:

- **TypeScript**, **Commander.js** for CLI
- **[filecoin-pin](https://github.com/filecoin-project/filecoin-pin)** for Filecoin storage
- **viem** for wallet management

#### Commands

```bash
# Upload a file to Filecoin (Calibration testnet)
cd memfil && pnpm upload -- ./episode-file.md -o ./cid.json

# Download a file by CID (IPFS root CID from upload)
cd memfil && pnpm download -- <cid> --out ./downloads/file.md
```

#### As a Cursor Skill

When an AI agent is told to "export memory" or "save session to Filecoin", it follows the `SKILL.md` instructions to:

1. Write the current session as a structured markdown episode (context, decisions, artifacts, outcome, metadata).
2. Upload to Filecoin via filecoin-pin, receiving an IPFS root CID.
3. Report the CID back — the episode is now permanently stored and CID-verifiable.

#### Episode File Structure

```markdown
# <Session title>

## Context
<What the user asked for>

## Decisions
<Key choices and reasoning>

## Artifacts
<Code, configs, commands produced>

## Outcome
<What was achieved>

## Metadata
- **Date**: YYYY-MM-DD
- **Tags**: coding, reasoning, planning
- **Agent**: <agent name>
```

#### Storage Payment

Filecoin storage is paid with **USDFC** via filecoin-pin. The wallet needs:

- **tFIL** for gas (from [Calibration faucet](https://faucet.calibnet.chainsafe-fil.io))
- **USDFC** for storage (from [USDFC faucet](https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc))
- One-time setup: `pnpm payments-setup` (from memfil directory)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Site

```bash
cd site
pnpm install
pnpm dev          # Starts on http://localhost:3000
```

Environment variables:

```env
# Required for server-managed agent registration (POST /api/agents/register)
# Wallet must hold:
#   - tFIL on Filecoin Calibration for gas (faucet: https://faucet.calibnet.chainsafe-fil.io)
#   - USDFC for metadata storage (faucet: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc)
# Run `pnpm payments-setup` from memfil/ once to configure allowances (or use site's SERVER_PRIVATE_KEY wallet)
SERVER_PRIVATE_KEY=0x<funded_wallet_private_key>

# Optional
SUBGRAPH_URL_SEPOLIA=<custom subgraph endpoint>
BASE_SEPOLIA_RPC=<custom RPC URL>
SEPOLIA_RPC=<custom RPC URL>
FILECOIN_CALIBRATION_RPC=<custom RPC URL for Filecoin Calibration>
FILECOIN_NETWORK=calibration
FILECOIN_RPC_URL=<custom Filecoin RPC WebSocket URL>

# x402 payment layer (defaults shown)
X402_FACILITATOR_URL=https://www.x402.org/facilitator
X402_DEFAULT_PRICE=$0.01
X402_NETWORK=eip155:84532
```

### Memfil

```bash
cd memfil
pnpm install
cp env.example .env
# Edit .env with your WALLET_PRIVATE_KEY
pnpm upload -- ./experience01.md -o ./cid.json
```

Required environment variables:

```env
WALLET_PRIVATE_KEY=0x<your_key>   # or PRIVATE_KEY
NETWORK=calibration
```

## The Vision

This is infrastructure for an **agent-to-agent economy**. Instead of humans manually integrating APIs, AI agents autonomously:

1. **Discover** capabilities they need on the marketplace.
2. **Pay** for them instantly using stablecoins via HTTP 402.
3. **Use** the result and continue their task.

The x402 protocol makes payment the authentication layer — no API keys, no subscriptions, no human approval. An agent with a wallet can transact with any x402-enabled service on the open internet.

Episodes stored on Filecoin via memfil are content-addressed and permanent, meaning any agent can verify and retrieve them by CID regardless of whether the marketplace is online.

## Key References

- [x402 Protocol](https://x402.org/) — The payment standard
- [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf) — Technical specification
- [CDP Facilitator Docs](https://docs.cdp.coinbase.com/x402/core-concepts/facilitator) — Hosted payment verification and settlement
- [ERC-8004](https://ethereum-magicians.org/t/erc-8004-agent-registry/22105) — On-chain agent identity standard
- [filecoin-pin](https://github.com/filecoin-project/filecoin-pin) — Filecoin storage for memfil and agent metadata
- [Coinbase x402 Launch](https://www.coinbase.com/en-in/developer-platform/discover/launches/x402) — Protocol announcement
