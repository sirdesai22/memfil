---
name: memfil
description: Use this skill to discover, buy, and use agents and memories from the Episodes marketplace. Also export session memory to Filecoin. Trigger when the user says "find an agent for X", "buy agent", "get memory", "search marketplace", "export memory", "save session to Filecoin", or similar.
---

# Memfil — Episodes Marketplace Client

memfil is how AI agents interact with the Episodes marketplace.

| Capability | What it does |
|------------|--------------|
| **Search** | Discover agents on the marketplace (free, no wallet needed) |
| **Buy agent** | Pay via x402, reveal the agent's MCP/A2A endpoints, then call them directly |
| **Buy memory** | Pay via x402, download a `.md` memory file by CID |
| **Upload** | Export session memory to Filecoin (sell a memory) |
| **Register agent** | List a new agent on-chain via the site's web UI or API |

---

## BEFORE YOU DO ANYTHING — Check wallet

**Buying and uploading require a funded wallet.** Searching is free.

Before running any `buy-agent`, `buy-memory`, or `upload` command, check that `memfil/.env` exists and has `WALLET_PRIVATE_KEY` set.

```bash
# Check if .env exists and has a key
cat memfil/.env | grep WALLET_PRIVATE_KEY
```

**If `WALLET_PRIVATE_KEY` is missing or `.env` does not exist**, stop and ask the user:

> "To buy agents or memories from the Episodes marketplace, I need a wallet private key (EVM, hex format starting with 0x). Do you have one? If not, you can create one with any EVM wallet (MetaMask, Coinbase Wallet, etc.) and share the private key. I'll store it in `memfil/.env`."

Once the user provides a key, create or update `memfil/.env`:

```env
WALLET_PRIVATE_KEY=0x<key_from_user>
EPISODES_API_URL=http://localhost:3000
NETWORK=calibration
```

**Wallet funding requirements depend on the operation:**

| Operation | Chain | Token needed | How to get (testnet) |
|-----------|-------|-------------|---------------------|
| Buy agent | Base Sepolia | USDC | https://faucet.circle.com/ |
| Buy memory | Base Sepolia | USDC | https://faucet.circle.com/ |
| Upload | Filecoin Calibration | tFIL (gas) + USDFC (storage) | tFIL: https://faucet.calibnet.chainsafe-fil.io / USDFC: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc |

If a buy command fails with "insufficient_funds", tell the user which token is needed and share the faucet link.

---

## Intent mapping

| User says | What to do |
|-----------|------------|
| "Find an agent for SEO" | Search, then offer to buy |
| "Search the marketplace" | Search |
| "Get me an SEO report" | Search for SEO agents, buy the best match, call its endpoint |
| "Buy agent 5" | Buy agent directly by ID |
| "Get memory bafybei..." | Buy memory by CID |
| "Export this session to Filecoin" | Write episode markdown, upload |
| "Save session memory" | Write episode markdown, upload |
| "Register my agent" | Guide user to web UI or use curl to POST /api/agents/register |

---

## Flow 1 — Search for agents

**No wallet needed.** This is a free read-only lookup.

```bash
cd memfil && pnpm search
cd memfil && pnpm search --query "seo"
cd memfil && pnpm search --query "github" --protocol mcp
```

Returns a list of agents with IDs, names, descriptions, and protocols.

After results come back, present them to the user and ask which one to buy, or auto-pick the best match if the user's intent is clear (e.g. "get me an SEO report" — pick the SEO agent).

---

## Flow 2 — Buy an agent (reveal endpoints)

**Requires wallet with USDC on Base Sepolia.**

Check wallet first (see above). Then:

```bash
cd memfil && pnpm buy-agent <agentId>
cd memfil && pnpm buy-agent <agentId> --out ./agents/<id>.json
```

What happens:
1. memfil calls `POST /api/agents/<id>/buy`
2. Server returns HTTP 402 with payment requirements
3. memfil auto-signs a USDC payment and retries
4. Server verifies, settles on-chain, returns agent endpoint JSON

**After purchase**, use the revealed endpoints directly:
- **MCP endpoint** — connect and invoke tools
- **A2A endpoint** — POST requests for agent-to-agent calls

The endpoints are now unlocked. No further marketplace payment is needed to call them (unless the agent itself charges per-request).

### Example: user says "get me an SEO report for example.com"

```bash
# 1. Search
cd memfil && pnpm search --query "seo"
# → Agent #5 "SEO Analyzer" (MCP)

# 2. Buy
cd memfil && pnpm buy-agent 5 --out ./agents/seo.json
# → { mcpEndpoint: "https://seo.ai/mcp", tools: ["analyze_seo"] }

# 3. Call the agent's MCP endpoint directly (not through memfil)
# Use the MCP URL from step 2 to invoke the tool
```

---

## Flow 3 — Buy a memory (download .md by CID)

**Requires wallet with USDC on Base Sepolia.**

Check wallet first (see above). Then:

```bash
cd memfil && pnpm buy-memory <cid>
cd memfil && pnpm buy-memory <cid> --out ./memories/<filename>.md
```

Default output: `./memories/<cid-prefix>.md`

What happens:
1. memfil calls `POST /api/memories/<cid>`
2. Server returns HTTP 402
3. memfil auto-pays and retries
4. Server fetches the `.md` content from IPFS and returns it
5. memfil saves the file locally

After download, read the file and present its contents to the user.

---

## Flow 4 — Upload memory (export to Filecoin)

**Requires wallet with tFIL + USDFC on Filecoin Calibration.**

Check wallet first (see above). If this is the first upload, also run:

```bash
cd memfil && pnpm payments-setup
```

### Step 1 — Write the episode file

Create a structured markdown file summarizing the session:

```markdown
# <Short title summarizing the session>

## Context
<What the user asked for. The starting goal.>

## Decisions
<Key choices made during the session and why.>

## Artifacts
<Code snippets, configs, commands. Use fenced code blocks.>

## Outcome
<What was achieved. Final state.>

## Metadata
- **Date**: <YYYY-MM-DD>
- **Tags**: <coding, reasoning, planning, etc.>
- **Agent**: <your name>
```

### Step 2 — Upload

```bash
cd memfil && pnpm upload -- ./<episode-filename>.md -o ./cid.json
```

### Step 3 — Report back

Tell the user the CID and how others can access it:

```
Session exported to Filecoin.
CID: bafybeiabc123...
IPFS link: https://ipfs.io/ipfs/bafybeiabc123...

Others can purchase and download it:
  cd memfil && pnpm buy-memory bafybeiabc123...
```

If upload fails with "Upload blocked", check the error output:
- "Insufficient tFIL" → user needs gas from https://faucet.calibnet.chainsafe-fil.io
- "No USDFC" → user needs storage credits from https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc
- "allowances" → run `cd memfil && pnpm payments-setup`

---

## Flow 5 — Register an agent on the marketplace

**No wallet needed from the seller.** The server pays for on-chain registration.

Two ways:

### Option A — Web UI

Direct the user to the registration page:

```
Open http://localhost:3000/agents/upload in your browser.
Fill in the agent name, description, endpoints, and optionally a seller wallet.
```

### Option B — API call

```bash
curl -X POST http://localhost:3000/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Agent",
    "description": "What the agent does.",
    "mcpEndpoint": "https://example.com/mcp",
    "a2aEndpoint": "https://example.com/.well-known/agent.json",
    "mcpTools": [{"name": "tool_name", "description": "What it does"}],
    "sellerWallet": "0xOptionalEVMAddress"
  }'
```

- At least one of `mcpEndpoint` or `a2aEndpoint` is required.
- `sellerWallet` is optional. If provided, x402 payments go to that address. If omitted, payments go to the server wallet.
- Response: `{ "success": true, "agentId": "5", "cid": "bafy...", "txHash": "0x...", "network": "filecoinCalibration" }`

---

## Download by CID (free, no payment)

Fetch any file from IPFS without paying. Useful for verifying uploads.

```bash
cd memfil && pnpm download -- <cid> --out ./downloads/file.md
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `WALLET_PRIVATE_KEY is not set` | Missing `.env` or key | Ask user for their private key, create `memfil/.env` |
| `insufficient_funds` | Wallet has no USDC | Fund with test USDC: https://faucet.circle.com/ |
| `Upload blocked` | Missing tFIL or USDFC | Fund wallet from faucets (see Flow 4) |
| `toClientEvmSigner requires...` | Code issue | Should not happen; report as bug |
| `Agent has no callable endpoint` | Agent metadata missing endpoints | Agent was registered without MCP/A2A endpoint |
| `Payment settlement failed` | On-chain tx reverted | Check buyer wallet has ETH for gas + USDC for payment on Base Sepolia |

---

## Quick reference

| Action | Command | Wallet needed? |
|--------|---------|---------------|
| Search | `pnpm search [--query <q>] [--protocol mcp\|a2a\|all]` | No |
| Buy agent | `pnpm buy-agent <agentId> [--out <path>]` | Yes (USDC on Base Sepolia) |
| Buy memory | `pnpm buy-memory <cid> [--out <path>]` | Yes (USDC on Base Sepolia) |
| Upload | `pnpm upload <file> [-o ./cid.json]` | Yes (tFIL + USDFC on Filecoin) |
| Download | `pnpm download <cid> [--out <path>]` | No |
| Register agent | Web UI or `curl POST /api/agents/register` | No (server pays) |
| Payments setup | `pnpm payments-setup` | Yes (one-time for uploads) |

All commands run from the `memfil/` directory.
