#!/usr/bin/env node
import 'dotenv/config'
import { Command } from 'commander'
import chalk from 'chalk'
import { uploadCommand } from './commands/upload.js'
import { downloadCommand } from './commands/download.js'

const program = new Command()

program
  .name('synapse-cli')
  .description('CLI for uploading and downloading files on Filecoin via Synapse SDK')
  .version('1.0.0')

// ── Upload command ────────────────────────────────────────────────────────────
program
  .command('upload <file>')
  .description('Upload a file to Filecoin decentralized storage')
  .option('-o, --output <path>', 'Save the resulting PieceCID to a JSON file')
  .action(async (file: string, opts: { output?: string }) => {
    await uploadCommand(file, { output: opts.output })
  })

// ── Download command ──────────────────────────────────────────────────────────
program
  .command('download <pieceCid>')
  .description('Download a file from Filecoin using its PieceCID')
  .option('--out <path>', 'Output file path (default: ./download-<cid>.bin)')
  // .example('download baga6ea4seaq... --out ./downloads/photo.jpg')
  .action(async (pieceCid: string, opts: { out?: string }) => {
    await downloadCommand(pieceCid, { out: opts.out })
  })

// ── Global error handling ─────────────────────────────────────────────────────
program.addHelpText('beforeAll', chalk.bold('\n🌐 Filecoin Synapse CLI\n'))
program.addHelpText(
  'afterAll',
  [
    '',
    chalk.dim('Environment variables (set in .env):'),
    chalk.dim('  WALLET_PRIVATE_KEY  Your wallet private key (required)'),
    chalk.dim('  NETWORK             calibration | mainnet  (default: calibration)'),
    chalk.dim('  WITH_CDN            true | false           (default: true)'),
    chalk.dim('  GLIF_TOKEN          Optional GLIF API token for higher rate limits'),
    '',
    chalk.dim('Prerequisites:'),
    chalk.dim('  1. Fund your wallet with tFIL (gas) from https://faucet.calibnet.chainsafe-fil.io'),
    chalk.dim('  2. Fund your wallet with USDFC (storage payments) from the calibration faucet'),
    chalk.dim('  3. Deposit USDFC to the Synapse payments contract before uploading'),
    '',
  ].join('\n')
)

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(chalk.red(`\n✗ Fatal error: ${message}`))
  process.exit(1)
})
