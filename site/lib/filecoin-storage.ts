import fs from "fs";
import os from "os";
import path from "path";
import {
  createCarFromPath,
  checkUploadReadiness,
  executeUpload,
  setupSynapse,
  cleanupSynapseService,
} from "filecoin-pin";
import { cleanupTempCar } from "filecoin-pin/core/unixfs";
import pino from "pino";

const log = pino({ level: process.env.LOG_LEVEL ?? "warn" });

const network = process.env.FILECOIN_NETWORK ?? "calibration";
const rpcUrl =
  process.env.FILECOIN_RPC_URL ??
  (network === "mainnet"
    ? "wss://wss.node.glif.io/apigw/lotus/rpc/v1"
    : "wss://wss.calibration.node.glif.io/apigw/lotus/rpc/v1");

/**
 * Uploads agent metadata JSON to Filecoin and returns the IPFS root CID.
 * Uses SERVER_PRIVATE_KEY for authentication.
 */
export async function uploadMetadataToFilecoin(
  metadata: object
): Promise<string> {
  const privateKey = process.env.SERVER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!privateKey || !privateKey.startsWith("0x")) {
    throw new Error(
      "SERVER_PRIVATE_KEY is required for Filecoin metadata upload"
    );
  }

  const tmpDir = os.tmpdir();
  const tmpPath = path.join(
    tmpDir,
    `agent-metadata-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );

  try {
    const jsonStr = JSON.stringify(metadata);
    fs.writeFileSync(tmpPath, jsonStr, "utf-8");

    // For metadata we want the root CID to be the JSON file itself,
    // so that ipfs://<cid> resolves directly to the JSON blob, not a directory.
    const carResult = await createCarFromPath(tmpPath, { bare: true });
    const carBytes = new Uint8Array(
      await fs.promises.readFile(carResult.carPath)
    );

    const service = await setupSynapse(
      { privateKey, rpcUrl },
      log
    );

    const readiness = await checkUploadReadiness({
      synapse: service.synapse,
      fileSize: carBytes.length,
      autoConfigureAllowances: true,
    });

    if (readiness.status === "blocked") {
      throw new Error(
        `Upload blocked: ${readiness.suggestions.join("; ")}`
      );
    }

    await executeUpload(service, carBytes, carResult.rootCid, {
      logger: log,
    });

    await cleanupSynapseService();
    await cleanupTempCar(carResult.carPath, log);

    return carResult.rootCid.toString();
  } finally {
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch {
      /* ignore */
    }
  }
}
