import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig, createSynapse } from '../utils/client.js'

export interface DownloadOptions {
  out?: string   // output file path
}

export async function downloadCommand(pieceCid: string, options: DownloadOptions): Promise<void> {
  if (!pieceCid || pieceCid.trim() === '') {
    console.error(chalk.red('✗ PieceCID is required.'))
    process.exit(1)
  }

  // Determine output path
  const outFileName = options.out ?? `download-${pieceCid.slice(0, 12)}.bin`
  const outPath = path.resolve(outFileName)

  // Ensure output directory exists
  const outDir = path.dirname(outPath)
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  console.log(chalk.bold('\n📥  Filecoin Download'))
  console.log(chalk.dim('─'.repeat(45)))
  console.log(chalk.dim(`  PieceCID : ${pieceCid}`))
  console.log(chalk.dim(`  Save to  : ${outPath}`))
  console.log()

  // ── Load config & create client ───────────────────────────────────────────────
  const config = loadConfig()
  const synapse = createSynapse(config.privateKey)

  // ── Download ──────────────────────────────────────────────────────────────────
  const spinner = ora('Fetching file from Filecoin…').start()

  let data: Uint8Array

  try {
    data = await synapse.storage.download({ pieceCid })
    spinner.succeed('Download complete!')
  } catch (err: unknown) {
    spinner.fail('Download failed')
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`\n✗ ${message}`))
    console.error(chalk.dim('\n  Make sure:'))
    console.error(chalk.dim('  • The PieceCID is correct'))
    console.error(chalk.dim('  • The file was uploaded with CDN enabled'))
    console.error(chalk.dim('  • You have sufficient funds / allowances on the storage contract'))
    process.exit(1)
  }

  // ── Write to disk ─────────────────────────────────────────────────────────────
  fs.writeFileSync(outPath, Buffer.from(data))

  const fileSizeKB = (data.byteLength / 1024).toFixed(2)

  console.log()
  console.log(chalk.green('✅ File saved successfully'))
  console.log(chalk.bold('   Path : ') + chalk.cyan(outPath))
  console.log(chalk.bold('   Size : ') + chalk.dim(`${fileSizeKB} KB`))
  console.log()
}
