import chalk from 'chalk'
import ora from 'ora'
import { getMarketplaceUrl } from '../utils/x402.js'

export interface SearchOptions {
  query?: string
  protocol?: string
}

interface AgentItem {
  agentId: string
  metadata?: { name?: string; description?: string }
  protocols?: string[]
}

export async function searchCommand(options: SearchOptions): Promise<void> {
  const baseUrl = getMarketplaceUrl()
  const params = new URLSearchParams()
  if (options.query) params.set('q', options.query)
  if (options.protocol && options.protocol !== 'all') {
    params.set('protocol', options.protocol)
  }
  const url = `${baseUrl}/api/agents?${params.toString()}`

  console.log(chalk.bold('\n🔍  Marketplace Search'))
  console.log(chalk.dim('─'.repeat(45)))
  if (options.query) {
    console.log(chalk.dim(`  Query    : ${options.query}`))
  }
  if (options.protocol && options.protocol !== 'all') {
    console.log(chalk.dim(`  Protocol : ${options.protocol}`))
  }
  console.log(chalk.dim(`  URL      : ${url}`))
  console.log()

  const spinner = ora('Searching…').start()

  try {
    const response = await fetch(url)
    const data = (await response.json()) as {
      success?: boolean
      error?: string
      items?: AgentItem[]
      total?: number
    }

    if (!response.ok) {
      spinner.fail('Search failed')
      console.error(chalk.red(`\n✗ ${data.error ?? `HTTP ${response.status}`}`))
      process.exit(1)
    }

    spinner.succeed(`Found ${data.items?.length ?? 0} agents`)

    if (!data.items?.length) {
      console.log()
      console.log(chalk.dim('  No agents found. Try a different query or protocol.'))
      console.log()
      return
    }

    console.log()
    for (const agent of data.items) {
      const name = agent.metadata?.name ?? 'Unnamed'
      const desc = (agent.metadata?.description ?? '').slice(0, 60)
      const protocols = (agent.protocols ?? []).join(', ') || '—'
      console.log(chalk.bold(`  ${agent.agentId}`) + chalk.dim('  ') + chalk.cyan(name))
      if (desc) {
        console.log(chalk.dim(`    ${desc}${desc.length >= 60 ? '…' : ''}`))
      }
      console.log(chalk.dim(`    Protocols: ${protocols}`))
      console.log()
    }
    console.log(chalk.dim('  Use: memfil buy-agent <agentId> to purchase and reveal endpoints'))
    console.log()
  } catch (err: unknown) {
    spinner.fail('Search failed')
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`\n✗ ${message}`))
    process.exit(1)
  }
}
