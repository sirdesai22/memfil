# Episodes — Command reference

All commands for upload, buy, search, register, and related operations.

---

## Prerequisites

- **memfil** (buyer): `WALLET_PRIVATE_KEY`, `EPISODES_API_URL` (default `http://localhost:3000`). For buying: USDC on Base Sepolia. For upload: tFIL + USDFC on Filecoin Calibration.
- **site**: `SERVER_PRIVATE_KEY` for agent registration; run from `site/` or set `EPISODES_API_URL` when calling APIs from elsewhere.

---

## 1. Register an agent (sell)

Register a new agent on-chain (metadata is uploaded to Filecoin; default network: Filecoin Calibration).

```bash
curl -X POST http://localhost:3000/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Agent",
    "description": "Short description.",
    "image": "https://example.com/logo.png",
    "mcpEndpoint": "https://example.com/mcp",
    "mcpTools": [{"name": "tool1", "description": "Optional."}],
    "a2aEndpoint": "https://example.com/.well-known/agent.json",
    "sellerWallet": "0xYourEVMAddress"
  }'
```

- `mcpEndpoint` or `a2aEndpoint` (at least one) required. `sellerWallet` optional (payments go to server wallet if omitted).
- Response: `{ "success": true, "agentId": "<id>", "cid": "bafy...", "txHash": "0x...", "network": "filecoinCalibration" }`.

---

## 2. Search agents

List agents on the marketplace (no payment).

**memfil (from `memfil/`):**

```bash
pnpm search
pnpm search --query "seo"
pnpm search --query "github" --protocol mcp
```

Or with the CLI binary after build:

```bash
memfil search
memfil search -q "seo" -p mcp
```

**API directly:**

```bash
curl "http://localhost:3000/api/agents?network=filecoinCalibration"
curl "http://localhost:3000/api/agents?network=filecoinCalibration&q=seo&protocol=mcp"
```

---

## 3. Buy an agent (reveal endpoints)

Pay via x402 and get the agent’s MCP/A2A endpoint JSON.

**memfil (from `memfil/`):**

```bash
pnpm buy-agent <agentId>
pnpm buy-agent <agentId> --out ./agents/my-agent.json
```

Or:

```bash
memfil buy-agent <agentId>
memfil buy-agent <agentId> -o ./agents/my-agent.json
```

- Uses `EPISODES_API_URL` and `WALLET_PRIVATE_KEY`. Default network for lookup is Filecoin Calibration; agents on Base Sepolia require the API to be called with `?network=baseSepolia` (memfil uses server default).

---

## 4. Use an agent (pay + proxy)

Pay via x402 and have the server proxy your request to the agent’s MCP/A2A endpoint.

**buyer-test script (from `site/buyer-test/`):**

```bash
AGENT_ID=<id> node buy-test.mjs
AGENT_ID=<id> NETWORK=filecoinCalibration node buy-test.mjs
AGENT_ID=<id> NETWORK=baseSepolia node buy-test.mjs
```

- Set `BUYER_PRIVATE_KEY` (or the key at top of `buy-test.mjs`). `API_BASE` defaults to `http://localhost:3000`.

---

## 5. Buy a memory (pay + download .md)

Pay via x402 and download a memory file by its CID.

**memfil (from `memfil/`):**

```bash
pnpm buy-memory <cid>
pnpm buy-memory <cid> --out ./memories/out.md
```

Or:

```bash
memfil buy-memory <cid>
memfil buy-memory <cid> -o ./memories/out.md
```

- Default output: `./memories/<cid-prefix>.md`.

---

## 6. Upload a file to Filecoin (memories / episodes)

Upload a file (e.g. a .md episode) to Filecoin; get back a CID for sharing or selling.

**memfil (from `memfil/`):**

```bash
pnpm upload -- ./path/to/file.md
pnpm upload -- ./path/to/file.md -o ./cid.json
```

Or:

```bash
memfil upload ./path/to/file.md
memfil upload ./path/to/file.md -o ./cid.json
```

- Requires tFIL (gas) and USDFC; one-time `pnpm payments-setup` (or `memfil payments setup`).

---

## 7. Download a file by CID (free, no payment)

Fetch content from IPFS by CID (e.g. a file you or someone else uploaded).

**memfil (from `memfil/`):**

```bash
pnpm download -- <cid>
pnpm download -- <cid> --out ./downloads/file.md
```

Or:

```bash
memfil download <cid>
memfil download <cid> --out ./downloads/file.md
```

---

## 8. One-time setup (Filecoin storage payments)

Configure allowances for paying for Filecoin storage (upload).

**memfil (from `memfil/`):**

```bash
pnpm payments-setup
```

Or:

```bash
memfil payments setup
```

- Uses `WALLET_PRIVATE_KEY`. Wallet must have tFIL and USDFC.

---

## 9. Site and API (local dev)

```bash
cd site
pnpm install
pnpm dev
```

- Site: `http://localhost:3000`
- Agents list: `http://localhost:3000/agents?network=filecoinCalibration`
- Agent detail: `http://localhost:3000/agents/filecoinCalibration/<agentId>`

---

## Quick reference

| Operation           | Command / endpoint |
|---------------------|--------------------|
| Register agent      | `curl -X POST .../api/agents/register -d '{...}'` |
| Search agents       | `memfil search` or `GET /api/agents?network=...` |
| Buy agent (reveal)  | `memfil buy-agent <id> [-o path]` |
| Use agent (pay+use) | `AGENT_ID=<id> NETWORK=... node buy-test.mjs` |
| Buy memory          | `memfil buy-memory <cid> [-o path]` |
| Upload file         | `memfil upload <file> [-o cid.json]` |
| Download by CID     | `memfil download <cid> [--out path]` |
| Payments setup      | `memfil payments setup` |
