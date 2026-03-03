import { setupSynapse, cleanupSynapseService, } from 'filecoin-pin';
import chalk from 'chalk';
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
/**
 * Reads and validates config from environment variables.
 */
export function loadConfig() {
    const privateKey = (process.env.WALLET_PRIVATE_KEY ?? process.env.PRIVATE_KEY);
    if (!privateKey) {
        console.error(chalk.red('✗ WALLET_PRIVATE_KEY (or PRIVATE_KEY) is not set in environment.'));
        console.error(chalk.dim('  Copy env.example to .env and fill in your private key.'));
        process.exit(1);
    }
    const normalized = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    return { privateKey: normalized };
}
const network = process.env.NETWORK ?? 'calibration';
const rpcUrl = process.env.RPC_URL ??
    (network === 'mainnet'
        ? 'wss://wss.node.glif.io/apigw/lotus/rpc/v1'
        : 'wss://wss.calibration.node.glif.io/apigw/lotus/rpc/v1');
/**
 * Initializes Synapse service via filecoin-pin.
 */
export async function initFilecoinPin(privateKey) {
    const config = { privateKey, rpcUrl };
    return setupSynapse(config, logger);
}
/**
 * Cleans up Synapse WebSocket connections.
 */
export async function cleanupFilecoin() {
    await cleanupSynapseService();
}
//# sourceMappingURL=client.js.map