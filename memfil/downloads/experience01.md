# experience 01

A TypeScript CLI for uploading and downloading files on Filecoin using the [@filoz/synapse-sdk](https://github.com/FilOzone/synapse-sdk). Targets the **Calibration testnet** by default.

---

## Folder Structure

```
filecoin-synapse-cli/
├── src/
│   ├── index.ts                 # CLI entry point (Commander)
│   ├── commands/
│   │   ├── upload.ts            # `upload <file>` command
│   │   └── download.ts          # `download <pieceCid>` command
│   └── utils/
│       └── client.ts            # Synapse client factory + config loader
├── .env                         # Your secrets (never commit this)
├── .env.example                 # Template for env vars
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Prerequisites

Before uploading files you need:

1. **tFIL** (gas) — get free testnet FIL:
   - https://faucet.calibnet.chainsafe-fil.io
   - https://beryx.zondax.ch/faucet

2. **USDFC** (storage payments) — get testnet USDFC:
   - https://faucet.calibration.filecoin.io (check for USDFC option)

3. **Deposit USDFC** into the Synapse payments contract before uploading. The easiest way is via the web app: https://fs-upload-dapp.netlify.app

---