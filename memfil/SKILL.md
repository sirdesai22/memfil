---
name: memex-cli
description: Upload and download files on Filecoin via the Synapse SDK. Use when working with this CLI project or when the user wants to store or retrieve files on Filecoin decentralized storage (Calibration testnet by default).
trigger: when user says "export memory to filecoin", "publish to marketplace"
---

# memex-cli (Filecoin Synapse CLI)

This skill covers the Filecoin Synapse CLI: upload and download files on Filecoin via the [@filoz/synapse-sdk](https://github.com/FilOzone/synapse-sdk). Targets **Calibration testnet** by default. Configure `.env` (see `.env.example`); required: `WALLET_PRIVATE_KEY`. Prerequisites: tFIL for gas, USDFC for storage, and a deposit to the Synapse payments contract.

---

## Scripts

### `build`

- **What it does:** Compiles TypeScript to `dist/`. Produces `dist/index.js` and command modules so the CLI can be run with `node`.
- **How to run:** `pnpm build` or `npm run build` from the project root.
- **When:** Before running the CLI with `node` or before distributing the binary. Not needed when using `pnpm dev` or `pnpm upload` / `pnpm download`.

### `dev`

- **What it does:** Runs the CLI in development mode with `tsx` (no compilation). With no arguments it prints help and available commands (`upload`, `download`). Pass a subcommand and args to run that command.
- **How to run:** `pnpm dev` (help only), or `pnpm dev -- upload <file>` / `pnpm dev -- download <pieceCid> [options]`.
- **When:** During development or when you want to run the CLI without building. Use `dev -- upload` or `dev -- download` to actually upload or download.

### `upload`

- **What it does:** Uploads a single file to Filecoin decentralized storage via the Synapse SDK. Reads the file, shows progress, and prints the PieceCID on success. Optionally writes the PieceCID (and metadata) to a JSON file.
- **How to run:** `pnpm upload -- <path/to/file>` or `pnpm dev -- upload <path/to/file>`. Optional: `--output <path>` or `-o <path>` to save the result to a JSON file (e.g. `pnpm upload -- ./data.csv -o ./cid.json`).
- **When:** When the user wants to store a file on Filecoin, persist a CID for later use, or automate uploads from scripts. Requires a funded wallet and Synapse contract deposit.

### `download`

- **What it does:** Downloads a file from Filecoin by its PieceCID. Fetches the content, verifies it against the CID, and writes it to disk. Uses CDN if enabled in config.
- **How to run:** `pnpm download -- <pieceCid>` or `pnpm dev -- download <pieceCid>`. Optional: `--out <path>` to set the output file (default: `./download-<cid>.bin`). Example: `pnpm download -- baga6ea4seaq... --out ./downloads/file.jpg`.
- **When:** When the user has a PieceCID and wants to retrieve the file, verify integrity, or save it to a specific path.

### `start`

- **What it does:** Runs the compiled CLI from `dist/index.js` with Node. With no arguments it prints help. Pass a subcommand and args to run that command (same as running `node dist/index.js <command> [args]`).
- **How to run:** `pnpm start` (help only), or `pnpm start -- upload <file>` / `pnpm start -- download <pieceCid> [options]`. Requires `pnpm build` first.
- **When:** When you want to run the built CLI (e.g. in production or without tsx). Use `start -- upload` or `start -- download` to perform uploads or downloads.

---

## Binary

The package exposes a bin: **`synapse-cli`**. After `pnpm build`, run `node dist/index.js` or install the package and invoke `synapse-cli` from the shell. Same commands and options as above (`upload <file>`, `download <pieceCid> --out <path>`).
