import { Synapse } from '@filoz/synapse-sdk';
import chalk from 'chalk';
import { privateKeyToAccount } from 'viem/accounts';
/**
 * Reads and validates config from environment variables.
 */
export function loadConfig() {
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
        console.error(chalk.red('✗ WALLET_PRIVATE_KEY is not set in environment.'));
        console.error(chalk.dim('  Copy .env.example to .env and fill in your private key.'));
        process.exit(1);
    }
    return { privateKey };
}
/**
 * Creates and returns a Synapse instance (sync, matches filecoin-dashboard pattern).
 */
export function createSynapse(privateKey) {
    return Synapse.create({
        account: privateKeyToAccount(privateKey),
    });
}
//# sourceMappingURL=client.js.map