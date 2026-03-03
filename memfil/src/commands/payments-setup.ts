import chalk from 'chalk'
import ora from 'ora'
import { loadConfig, initFilecoinPin, cleanupFilecoin } from '../utils/client.js'
import { setMaxAllowances } from 'filecoin-pin'

/**
 * Configures WarmStorage allowances for Filecoin storage payments.
 * Uses the filecoin-pin library directly (no CLI dependency on node-datachannel).
 */
export async function paymentsSetupCommand(): Promise<void> {
  console.log(chalk.bold('\n📋  Filecoin Payments Setup'))
  console.log(chalk.dim('─'.repeat(45)))
  console.log()

  const config = loadConfig()
  const spinner = ora('Configuring storage allowances…').start()

  try {
    const service = await initFilecoinPin(config.privateKey)
    const result = await setMaxAllowances(service.synapse)
    await cleanupFilecoin()

    spinner.succeed('Allowances configured!')

    if (result.transactionHash) {
      console.log()
      console.log(chalk.green('✅ Storage payment allowances are set'))
      console.log(chalk.dim(`   Tx: ${result.transactionHash}`))
    } else {
      console.log()
      console.log(chalk.green('✅ Allowances already configured (no tx needed)'))
    }

    console.log()
    console.log(chalk.dim('  You can now run: pnpm upload -- ./yourfile.txt'))
    console.log()
  } catch (err: unknown) {
    spinner.fail('Setup failed')
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`\n✗ ${message}`))
    console.error(chalk.dim('\n  Make sure:'))
    console.error(chalk.dim('  • Your wallet has tFIL for gas'))
    console.error(chalk.dim('  • Your wallet has USDFC'))
    console.error(chalk.dim('  • USDFC faucet: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc'))
    process.exit(1)
  }
}
