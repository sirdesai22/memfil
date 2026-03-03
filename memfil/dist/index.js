#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import { uploadCommand } from './commands/upload.js';
import { downloadCommand } from './commands/download.js';
import { paymentsSetupCommand } from './commands/payments-setup.js';
import { buyAgentCommand } from './commands/buy-agent.js';
import { buyMemoryCommand } from './commands/buy-memory.js';
import { searchCommand } from './commands/search.js';
const program = new Command();
program
    .name('memfil')
    .description('Marketplace client for Episodes: discover, buy, and use agents/memories')
    .version('1.0.0');
// ── Search command ───────────────────────────────────────────────────────────
program
    .command('search')
    .description('Search the marketplace for agents')
    .option('-q, --query <q>', 'Search query')
    .option('-p, --protocol <mcp|a2a|all>', 'Filter by protocol (default: all)')
    .action(async (opts) => {
    await searchCommand({ query: opts.query, protocol: opts.protocol });
});
// ── Buy agent command ──────────────────────────────────────────────────────────
program
    .command('buy-agent <agentId>')
    .description('Pay and reveal agent MCP/A2A endpoints')
    .option('-o, --out <path>', 'Save agent endpoint JSON to file')
    .action(async (agentId, opts) => {
    await buyAgentCommand(agentId, { out: opts.out });
});
// ── Buy memory command ────────────────────────────────────────────────────────
program
    .command('buy-memory <cid>')
    .description('Pay and download a memory (.md file) by CID')
    .option('-o, --out <path>', 'Output file path (default: ./memories/<cid-prefix>.md)')
    .action(async (cid, opts) => {
    await buyMemoryCommand(cid, { out: opts.out });
});
// ── Upload command ────────────────────────────────────────────────────────────
program
    .command('upload <file>')
    .description('Upload a file to Filecoin decentralized storage')
    .option('-o, --output <path>', 'Save the resulting CID to a JSON file')
    .action(async (file, opts) => {
    await uploadCommand(file, { output: opts.output });
});
// ── Payments setup command ────────────────────────────────────────────────────
program
    .command('payments setup')
    .description('Configure storage payment allowances (one-time, uses library not CLI)')
    .action(() => paymentsSetupCommand());
// ── Download command ──────────────────────────────────────────────────────────
program
    .command('download <cid>')
    .description('Download a file from IPFS using its CID (root CID from upload)')
    .option('--out <path>', 'Output file path (default: ./download-<cid>.bin)')
    .action(async (cid, opts) => {
    await downloadCommand(cid, { out: opts.out });
});
// ── Global error handling ─────────────────────────────────────────────────────
program.addHelpText('beforeAll', chalk.bold('\n🌐 Episodes Marketplace Client (memfil)\n'));
program.addHelpText('afterAll', [
    '',
    chalk.dim('Environment variables (set in .env):'),
    chalk.dim('  WALLET_PRIVATE_KEY  Your wallet private key (required, or PRIVATE_KEY)'),
    chalk.dim('  EPISODES_API_URL    Marketplace API base URL (default: http://localhost:3000)'),
    chalk.dim('  NETWORK             calibration | mainnet  (default: calibration, for upload)'),
    chalk.dim('  RPC_URL             Optional Filecoin RPC WebSocket URL'),
    '',
    chalk.dim('Buying (search, buy-agent, buy-memory):'),
    chalk.dim('  • Wallet needs USDC on Base Sepolia (x402 payments)'),
    chalk.dim('  • Faucet: https://faucet.circle.com/ for test USDC'),
    '',
    chalk.dim('Uploading (upload):'),
    chalk.dim('  1. Fund wallet with tFIL (gas) from https://faucet.calibnet.chainsafe-fil.io'),
    chalk.dim('  2. Fund with USDFC (storage) from https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc'),
    chalk.dim('  3. Run: memfil payments setup (one-time)'),
    '',
].join('\n'));
program.parseAsync(process.argv).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`\n✗ Fatal error: ${message}`));
    process.exit(1);
});
//# sourceMappingURL=index.js.map