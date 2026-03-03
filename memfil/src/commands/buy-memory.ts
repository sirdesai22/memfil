import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../utils/client.js'
import { createPaymentFetch, getMarketplaceUrl } from '../utils/x402.js'

export interface BuyMemoryOptions {
  out?: string
}

export async function buyMemoryCommand(
  cid: string,
  options: BuyMemoryOptions
): Promise<void> {
  if (!cid || cid.trim() === '') {
    console.error(chalk.red('✗ CID is required.'))
    process.exit(1)
  }

  const config = loadConfig()
  const baseUrl = getMarketplaceUrl()
  const url = `${baseUrl}/api/memories/${encodeURIComponent(cid)}`

  const outFileName =
    options.out ?? path.join('./memories', `${cid.slice(0, 12)}.md`)
  const outPath = path.resolve(outFileName)

  console.log(chalk.bold('\n🛒  Buy Memory'))
  console.log(chalk.dim('─'.repeat(45)))
  console.log(chalk.dim(`  CID     : ${cid}`))
  console.log(chalk.dim(`  Save to : ${outPath}`))
  console.log()

  const spinner = ora('Requesting (will pay if 402 required)…').start()

  try {
    const fetchWithPayment = createPaymentFetch(config.privateKey)
    const response = await fetchWithPayment(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      spinner.fail('Request failed')
      console.error(chalk.red(`\n✗ ${errData.error ?? `HTTP ${response.status}`}`))
      process.exit(1)
    }

    const content = await response.text()
    spinner.succeed('Payment complete!')

    const outDir = path.dirname(outPath)
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }
    fs.writeFileSync(outPath, content, 'utf-8')

    const fileSizeKB = (content.length / 1024).toFixed(2)

    console.log()
    console.log(chalk.green('✅ Memory saved successfully'))
    console.log(chalk.bold('   Path : ') + chalk.cyan(outPath))
    console.log(chalk.bold('   Size : ') + chalk.dim(`${fileSizeKB} KB`))
    console.log()
  } catch (err: unknown) {
    spinner.fail('Request failed')
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`\n✗ ${message}`))
    process.exit(1)
  }
}
