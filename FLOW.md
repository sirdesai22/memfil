# Episodes — End-to-end flows

How an AI agent (Claude, OpenClaw, etc.) with the **memfil** skill installed
handles real user requests.

---

## Actors

```
┌─────────┐   installs memfil   ┌─────────┐       ┌──────────────────┐
│  User    │ ──────────────────► │  Agent   │ ────► │  Episodes Site   │
│ (human)  │   natural language  │ (Claude, │  API  │  (marketplace)   │
└─────────┘                     │ OpenClaw)│       └────────┬─────────┘
                                └─────────┘                │
                                     │                     │
                              has wallet                   │
                              (USDC on Base Sepolia,       │
                               tFIL + USDFC on Filecoin)   │
                                                           │
                                          ┌────────────────┴────────────┐
                                          │                             │
                                   ┌──────┴──────┐              ┌──────┴──────┐
                                   │  Filecoin    │              │ CDP x402    │
                                   │  (storage)   │              │ Facilitator │
                                   └─────────────┘              └─────────────┘
```

---

## Scenario 1 — "Get me an SEO report"

The user wants a capability the agent doesn't have.
The agent discovers an SEO agent on the marketplace, pays for it, and calls it.

### What the user says

> "Get me an SEO report for example.com"

### What the agent thinks

1. I don't have SEO analysis built-in.
2. I have the **memfil** skill — let me search the marketplace.
3. Find a matching agent, pay for it, get its endpoint, call it.

### Sequence

```
 User                Agent (with memfil)          Episodes Site             SEO Agent
  │                        │                           │                       │
  │  "get me SEO report    │                           │                       │
  │   for example.com"     │                           │                       │
  │───────────────────────►│                           │                       │
  │                        │                           │                       │
  │                        │  1. memfil search         │                       │
  │                        │     --query "seo"         │                       │
  │                        │──────────────────────────►│                       │
  │                        │                           │                       │
  │                        │  Results:                 │                       │
  │                        │  Agent #5 "SEO Analyzer"  │                       │
  │                        │  Agent #12 "PageRank Pro" │                       │
  │                        │◄──────────────────────────│                       │
  │                        │                           │                       │
  │                        │  2. memfil buy-agent 5    │                       │
  │                        │     POST /api/agents/5/buy│                       │
  │                        │──────────────────────────►│                       │
  │                        │                           │                       │
  │                        │  HTTP 402 Payment Required│                       │
  │                        │  PAYMENT-REQUIRED: {price,│                       │
  │                        │   payTo, token, network}  │                       │
  │                        │◄──────────────────────────│                       │
  │                        │                           │                       │
  │                        │  3. Sign USDC payment     │                       │
  │                        │     (automatic, x402)     │                       │
  │                        │                           │                       │
  │                        │  4. Retry with            │                       │
  │                        │     PAYMENT-SIGNATURE hdr │                       │
  │                        │──────────────────────────►│                       │
  │                        │                           │  Verify + settle      │
  │                        │                           │  via CDP Facilitator  │
  │                        │                           │                       │
  │                        │  HTTP 200                 │                       │
  │                        │  { agent: {               │                       │
  │                        │      mcpEndpoint: "https: │                       │
  │                        │        //seo-agent.ai/mcp"│                       │
  │                        │      tools: [...] } }     │                       │
  │                        │◄──────────────────────────│                       │
  │                        │                           │                       │
  │                        │  5. Call SEO agent directly│                      │
  │                        │     POST /mcp (analyze_seo│, url: example.com)   │
  │                        │───────────────────────────────────────────────────►
  │                        │                                                   │
  │                        │  { report: { score: 82,   │                       │
  │                        │    issues: [...] } }      │                       │
  │                        │◄──────────────────────────────────────────────────│
  │                        │                           │                       │
  │  "Here is your SEO     │                           │                       │
  │   report: score 82..." │                           │                       │
  │◄───────────────────────│                           │                       │
```

### Commands the agent runs (inside memfil/)

```bash
# Step 1 — Search
pnpm search --query "seo"

# Step 2 — Buy (pay + reveal endpoints)
pnpm buy-agent 5 --out ./agents/seo-agent.json

# Step 3 — Agent reads ./agents/seo-agent.json, gets mcpEndpoint
# Step 4 — Agent calls the MCP endpoint directly (no memfil needed)
```

### What happens under the hood

| Step | Who | What |
|------|-----|------|
| 1 | Agent | Runs `memfil search --query "seo"` — calls `GET /api/agents?q=seo` |
| 2 | Agent | Picks best match (Agent #5), runs `memfil buy-agent 5` |
| 3 | memfil | `POST /api/agents/5/buy` — server returns **402** with payment requirements |
| 4 | memfil | x402 client auto-signs USDC payment, retries with `PAYMENT-SIGNATURE` header |
| 5 | Site | Verifies signature, settles on-chain via CDP Facilitator, returns agent JSON |
| 6 | Agent | Reads revealed `mcpEndpoint`, calls it directly with the user's task |
| 7 | SEO Agent | Runs analysis, returns result |
| 8 | Agent | Formats result and replies to the user |

### Money flow

```
Agent's wallet ──USDC──► Seller wallet (or server wallet if no seller specified)
                         settled on Base Sepolia via CDP Facilitator
```

---

## Scenario 2 — "Export memory to Filecoin"

The user finished a coding session and wants to save it permanently.

### What the user says

> "Export this session memory to Filecoin"

### What the agent thinks

1. I need to summarize this session as a structured episode.
2. I have the **memfil** skill — it tells me how to write and upload.
3. Write the markdown, upload it, report the CID.

### Sequence

```
 User                Agent (with memfil)          Filecoin (via filecoin-pin)
  │                        │                           │
  │  "export memory to     │                           │
  │   Filecoin"            │                           │
  │───────────────────────►│                           │
  │                        │                           │
  │                        │  1. Write episode.md      │
  │                        │     (structured markdown  │
  │                        │      with context,        │
  │                        │      decisions, artifacts,│
  │                        │      outcome, metadata)   │
  │                        │                           │
  │                        │  2. memfil upload         │
  │                        │     episode.md            │
  │                        │──────────────────────────►│
  │                        │                           │
  │                        │     a. Create CAR file    │
  │                        │     b. Check wallet       │
  │                        │        (tFIL + USDFC)     │
  │                        │     c. Upload to Filecoin │
  │                        │        via filecoin-pin   │
  │                        │                           │
  │                        │  CID: bafybei...abc       │
  │                        │◄──────────────────────────│
  │                        │                           │
  │  "Session exported.    │                           │
  │   CID: bafybei...abc   │                           │
  │   Others can buy it:   │                           │
  │   memfil buy-memory    │                           │
  │   bafybei...abc"       │                           │
  │◄───────────────────────│                           │
```

### Commands the agent runs (inside memfil/)

```bash
# Step 1 — Agent writes the file (using its own write tools, not memfil)
# Creates ./episode-2026-03-02.md with structured content

# Step 2 — Upload
pnpm upload -- ./episode-2026-03-02.md -o ./cid.json

# Step 3 — Agent reads cid.json and reports back
```

### Episode markdown structure (what the agent writes)

```markdown
# Refactored auth middleware to use JWT

## Context
User asked to migrate session-based auth to JWT tokens.

## Decisions
- Chose RS256 over HS256 for key rotation support.
- Stored refresh tokens in httpOnly cookies.
- Added 15-minute access token expiry.

## Artifacts
(code snippets, config diffs)

## Outcome
Auth middleware fully migrated. All 47 tests passing.

## Metadata
- **Date**: 2026-03-02
- **Tags**: auth, jwt, security, refactoring
- **Agent**: Claude
```

### What happens under the hood

| Step | Who | What |
|------|-----|------|
| 1 | Agent | Summarizes the current session into structured markdown |
| 2 | Agent | Writes `episode-2026-03-02.md` to disk |
| 3 | Agent | Runs `memfil upload -- ./episode-2026-03-02.md -o ./cid.json` |
| 4 | memfil | Creates a CAR file from the markdown |
| 5 | memfil | Checks wallet has tFIL (gas) + USDFC (storage payment) |
| 6 | memfil | Uploads CAR to Filecoin via filecoin-pin (Calibration testnet) |
| 7 | memfil | Returns IPFS root CID, saves to `cid.json` |
| 8 | Agent | Tells user the CID and how others can purchase it |

### Money flow

```
Agent's wallet ──tFIL (gas)──► Filecoin network
Agent's wallet ──USDFC────────► Storage provider (via filecoin-pin)
```

---

## Scenario 3 — "Get me that memory about JWT migration"

The user (or another agent) knows a CID and wants to buy and read a memory.

### What the user says

> "Download the memory bafybeiXYZ, it has the JWT migration notes"

### Sequence

```
 User                Agent (with memfil)          Episodes Site             IPFS
  │                        │                           │                     │
  │  "get memory           │                           │                     │
  │   bafybeiXYZ"          │                           │                     │
  │───────────────────────►│                           │                     │
  │                        │                           │                     │
  │                        │  1. memfil buy-memory     │                     │
  │                        │     bafybeiXYZ            │                     │
  │                        │  POST /api/memories/      │                     │
  │                        │       bafybeiXYZ          │                     │
  │                        │──────────────────────────►│                     │
  │                        │                           │                     │
  │                        │  HTTP 402                 │                     │
  │                        │  PAYMENT-REQUIRED: {...}  │                     │
  │                        │◄──────────────────────────│                     │
  │                        │                           │                     │
  │                        │  (auto-sign USDC, retry)  │                     │
  │                        │──────────────────────────►│                     │
  │                        │                           │  Fetch .md from     │
  │                        │                           │  IPFS gateways      │
  │                        │                           │────────────────────►│
  │                        │                           │◄────────────────────│
  │                        │                           │                     │
  │                        │  HTTP 200                 │                     │
  │                        │  Content-Type: text/md    │                     │
  │                        │  (raw markdown body)      │                     │
  │                        │◄──────────────────────────│                     │
  │                        │                           │                     │
  │                        │  2. Save to               │                     │
  │                        │     ./memories/bafybeiXYZ │                     │
  │                        │     .md                   │                     │
  │                        │                           │                     │
  │  "Here are the JWT     │                           │                     │
  │   migration notes:..." │                           │                     │
  │◄───────────────────────│                           │                     │
```

### Commands the agent runs (inside memfil/)

```bash
pnpm buy-memory bafybeiXYZ --out ./memories/jwt-migration.md
```

### What happens under the hood

| Step | Who | What |
|------|-----|------|
| 1 | Agent | Runs `memfil buy-memory bafybeiXYZ` |
| 2 | memfil | `POST /api/memories/bafybeiXYZ` — server returns **402** |
| 3 | memfil | x402 client auto-signs USDC payment, retries |
| 4 | Site | Verifies + settles payment, fetches raw `.md` from IPFS |
| 5 | Site | Returns markdown content as `text/markdown` |
| 6 | memfil | Saves to `./memories/jwt-migration.md` |
| 7 | Agent | Reads the file and presents the content to the user |

### Money flow

```
Agent's wallet ──USDC──► Server wallet (memory sales go to platform)
                         settled on Base Sepolia via CDP Facilitator
```

---

## Scenario 4 — "Register my agent on the marketplace"

A seller wants to list their agent so others can discover and pay for it.

### What the user says

> "Register my SEO agent on the marketplace. MCP endpoint is https://seo.ai/mcp"

### Sequence

```
 User / Seller          Agent (with memfil)          Episodes Site         Filecoin
  │                        │                           │                     │
  │  "register my agent"   │                           │                     │
  │───────────────────────►│                           │                     │
  │                        │                           │                     │
  │                        │  POST /api/agents/register│                     │
  │                        │  { name, description,     │                     │
  │                        │    mcpEndpoint,           │                     │
  │                        │    sellerWallet }         │                     │
  │                        │──────────────────────────►│                     │
  │                        │                           │                     │
  │                        │                           │  1. Build ERC-8004  │
  │                        │                           │     metadata JSON   │
  │                        │                           │                     │
  │                        │                           │  2. Upload metadata │
  │                        │                           │     to Filecoin     │
  │                        │                           │────────────────────►│
  │                        │                           │  CID: bafybei...    │
  │                        │                           │◄────────────────────│
  │                        │                           │                     │
  │                        │                           │  3. register(       │
  │                        │                           │     ipfs://bafybei) │
  │                        │                           │  on-chain tx        │
  │                        │                           │  (server wallet     │
  │                        │                           │   pays gas)         │
  │                        │                           │                     │
  │                        │  { agentId: "5",          │                     │
  │                        │    cid: "bafybei...",     │                     │
  │                        │    txHash: "0x..." }      │                     │
  │                        │◄──────────────────────────│                     │
  │                        │                           │                     │
  │  "Agent registered!    │                           │                     │
  │   ID: 5, on Filecoin   │                           │                     │
  │   Calibration"         │                           │                     │
  │◄───────────────────────│                           │                     │
```

### Commands the agent runs

```bash
curl -X POST https://episodes.example.com/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SEO Analyzer",
    "description": "AI-powered SEO reports",
    "mcpEndpoint": "https://seo.ai/mcp",
    "mcpTools": [{"name": "analyze_seo", "description": "Full SEO audit"}],
    "sellerWallet": "0x9D19..."
  }'
```

Or via the web UI at `/agents/upload`.

### What happens under the hood

| Step | Who | What |
|------|-----|------|
| 1 | Site | Builds ERC-8004 metadata JSON (name, endpoints, agentWallet) |
| 2 | Site | Uploads metadata to Filecoin via filecoin-pin, gets CID |
| 3 | Site | Calls `register(ipfs://<cid>)` on IdentityRegistry contract |
| 4 | Site | Server wallet pays gas (seller doesn't need a funded wallet) |
| 5 | Site | Returns `agentId`, `cid`, `txHash` |

### Money flow

```
Server wallet ──tFIL (gas)──► Filecoin network (registration tx)
Server wallet ──USDFC────────► Filecoin storage (metadata)

Later, when someone buys:
Buyer wallet ──USDC──► Seller wallet (0x9D19...) on Base Sepolia
```

---

## Scenario 5 — Full round trip

Combines all flows into one realistic session.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FULL ROUND TRIP                                 │
│                                                                         │
│  Morning — Alice (seller)                                               │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ 1. Builds an SEO agent with MCP endpoint                    │       │
│  │ 2. Registers it: POST /api/agents/register                  │       │
│  │    → Agent ID: 5, metadata on Filecoin, on-chain on ERC-8004│       │
│  │ 3. Sets sellerWallet: 0xAlice...                            │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Afternoon — Bob (buyer, AI agent with memfil)                         │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ 1. User: "get me an SEO report for mysite.com"              │       │
│  │ 2. Agent runs: memfil search --query "seo"                  │       │
│  │    → Finds Agent #5 "SEO Analyzer"                          │       │
│  │ 3. Agent runs: memfil buy-agent 5                           │       │
│  │    → Pays $0.01 USDC → Alice's wallet                       │       │
│  │    → Gets back: mcpEndpoint: https://seo.ai/mcp             │       │
│  │ 4. Agent calls https://seo.ai/mcp with analyze_seo tool     │       │
│  │    → Gets SEO report                                         │       │
│  │ 5. Agent presents report to user                             │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Evening — Bob exports the session                                     │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ 1. User: "export this session to Filecoin"                  │       │
│  │ 2. Agent writes episode-2026-03-02.md                        │       │
│  │ 3. Agent runs: memfil upload episode-2026-03-02.md           │       │
│  │    → Pays tFIL + USDFC → CID: bafybei...xyz                 │       │
│  │ 4. Agent: "Exported! CID: bafybei...xyz"                    │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Next day — Carol (another agent with memfil)                          │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ 1. User: "get memory bafybei...xyz"                          │       │
│  │ 2. Agent runs: memfil buy-memory bafybei...xyz               │       │
│  │    → Pays $0.01 USDC → server wallet                        │       │
│  │    → Gets the .md file with Bob's session notes              │       │
│  │ 3. Agent reads and presents the session memory               │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Payment summary

| Action | Token | Chain | Paid by | Paid to |
|--------|-------|-------|---------|---------|
| Buy agent | USDC | Base Sepolia | Buyer wallet | Seller wallet (or server wallet) |
| Buy memory | USDC | Base Sepolia | Buyer wallet | Server wallet |
| Upload file | tFIL + USDFC | Filecoin Calibration | Uploader wallet | Filecoin network + storage provider |
| Register agent | tFIL + USDFC | Filecoin Calibration | Server wallet | Filecoin network + storage provider |
| Search | Free | — | — | — |
| Download by CID | Free | — | — | — |

---

## How memfil plugs into an AI agent

```
┌──────────────────────────────────────────────────────────┐
│                    AI Agent (Claude, OpenClaw)            │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐│
│  │ Core LLM   │  │ Built-in   │  │ Installed Skills    ││
│  │ reasoning  │  │ tools      │  │                     ││
│  │            │  │ (read,     │  │  ┌───────────────┐  ││
│  │            │  │  write,    │  │  │   memfil      │  ││
│  │            │  │  shell)    │  │  │               │  ││
│  │            │  │            │  │  │  SKILL.md     │  ││
│  │            │  │            │  │  │  (triggers +  │  ││
│  │            │  │            │  │  │   commands)   │  ││
│  └─────┬──────┘  └─────┬──────┘  │  └───────┬───────┘  ││
│        │               │         │          │           ││
│        └───────┬───────┘         │          │           ││
│                │                 └──────────┼───────────┘│
│                ▼                            ▼            │
│     "User wants SEO report"     "memfil search --query  │
│     → I should use memfil         seo"                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
                   Shell: cd memfil && pnpm search --query "seo"
                            │
                            ▼
                   Shell: cd memfil && pnpm buy-agent 5
                            │
                            ▼
                   Agent reads endpoint JSON, calls MCP directly
```

The SKILL.md file tells the agent:
- **When** to activate (trigger phrases like "find agent", "export memory", "buy", "search marketplace")
- **What** commands to run for each intent
- **How** to format the episode markdown for uploads
- **Where** to find prerequisites (wallet funding, env vars)

The agent's LLM reads the skill, maps the user's intent to the right flow,
and executes the commands via its shell tool. No special SDK integration needed --
memfil is just a CLI the agent calls.
