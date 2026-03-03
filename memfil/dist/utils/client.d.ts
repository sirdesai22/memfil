import { type SynapseService } from 'filecoin-pin';
/**
 * Reads and validates config from environment variables.
 */
export declare function loadConfig(): {
    privateKey: `0x${string}`;
};
/**
 * Initializes Synapse service via filecoin-pin.
 */
export declare function initFilecoinPin(privateKey: `0x${string}`): Promise<SynapseService>;
/**
 * Cleans up Synapse WebSocket connections.
 */
export declare function cleanupFilecoin(): Promise<void>;
//# sourceMappingURL=client.d.ts.map