import { Synapse } from '@filoz/synapse-sdk';
/**
 * Reads and validates config from environment variables.
 */
export declare function loadConfig(): {
    privateKey: `0x${string}`;
};
/**
 * Creates and returns a Synapse instance (sync, matches filecoin-dashboard pattern).
 */
export declare function createSynapse(privateKey: `0x${string}`): InstanceType<typeof Synapse>;
//# sourceMappingURL=client.d.ts.map