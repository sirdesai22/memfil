import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import pino from 'pino';
import { loadConfig, initFilecoinPin, cleanupFilecoin, } from '../utils/client.js';
import { createCarFromPath, checkUploadReadiness, executeUpload, } from 'filecoin-pin';
import { cleanupTempCar } from 'filecoin-pin/core/unixfs';
export async function uploadCommand(filePath, options) {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
        console.error(chalk.red(`✗ File not found: ${resolvedPath}`));
        process.exit(1);
    }
    const stats = fs.statSync(resolvedPath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    const fileName = path.basename(resolvedPath);
    console.log(chalk.bold('\n📤  Filecoin Upload'));
    console.log(chalk.dim('─'.repeat(45)));
    console.log(chalk.dim(`  File   : ${fileName}`));
    console.log(chalk.dim(`  Size   : ${fileSizeKB} KB`));
    console.log();
    const config = loadConfig();
    const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });
    const carSpinner = ora('Creating CAR file…').start();
    let carResult;
    let carBytes;
    try {
        carResult = await createCarFromPath(resolvedPath, { bare: false });
        carBytes = new Uint8Array(await fs.promises.readFile(carResult.carPath));
        carSpinner.succeed('CAR file created');
    }
    catch (err) {
        carSpinner.fail('CAR creation failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n✗ ${message}`));
        process.exit(1);
    }
    const uploadSpinner = ora('Uploading to Filecoin…').start();
    try {
        const service = await initFilecoinPin(config.privateKey);
        const readiness = await checkUploadReadiness({
            synapse: service.synapse,
            fileSize: carBytes.length,
            autoConfigureAllowances: true,
        });
        if (readiness.status === 'blocked') {
            uploadSpinner.fail('Upload blocked');
            console.error(chalk.red('\n✗ Cannot upload:'));
            const v = readiness.validation;
            if (v?.errorMessage)
                console.error(chalk.dim(`  • ${v.errorMessage}`));
            if (v?.helpMessage)
                console.error(chalk.dim(`  • ${v.helpMessage}`));
            readiness.suggestions?.forEach((s) => console.error(chalk.dim(`  • ${s}`)));
            if (readiness.filStatus && !readiness.filStatus.hasSufficientGas) {
                console.error(chalk.dim('  • Insufficient tFIL for gas. Faucet: https://faucet.calibnet.chainsafe-fil.io'));
            }
            const bal = readiness.walletUsdfcBalance;
            if (bal !== undefined && bal === 0n) {
                console.error(chalk.dim('  • No USDFC in wallet. Faucet: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc'));
            }
            if (readiness.allowances?.needsUpdate && !readiness.allowances?.updated) {
                console.error(chalk.dim('  • Run: pnpm payments setup (or memfil payments setup)'));
            }
            if (!v?.errorMessage &&
                !v?.helpMessage &&
                !readiness.suggestions?.length &&
                readiness.filStatus?.hasSufficientGas &&
                (bal === undefined || bal > 0n) &&
                !readiness.allowances?.needsUpdate) {
                console.error(chalk.dim('  • Check capacity / deposit. Run: memfil payments setup'));
            }
            await cleanupFilecoin();
            process.exit(1);
        }
        const result = await executeUpload(service, carBytes, carResult.rootCid, {
            logger: log,
        });
        await cleanupFilecoin();
        await cleanupTempCar(carResult.carPath, log);
        const cidStr = carResult.rootCid.toString();
        uploadSpinner.succeed('Upload complete!');
        console.log();
        console.log(chalk.green('✅ File uploaded successfully'));
        console.log(chalk.bold('   CID: ') + chalk.cyan(cidStr));
        console.log(chalk.dim(`   IPFS: https://ipfs.io/ipfs/${cidStr}`));
        if (options.output) {
            const outPath = path.resolve(options.output);
            fs.writeFileSync(outPath, JSON.stringify({
                cid: cidStr,
                pieceCid: result.pieceCid?.toString?.() ?? result.pieceCid,
                file: fileName,
                uploadedAt: new Date().toISOString(),
            }, null, 2));
            console.log(chalk.dim(`\n  CID saved to: ${outPath}`));
        }
        console.log();
        console.log(chalk.dim('  Use the CID above with the download command:'));
        console.log(chalk.dim(`  pnpm download "${cidStr}" --out ./downloads/${fileName}`));
        console.log();
    }
    catch (err) {
        uploadSpinner.fail('Upload failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n✗ ${message}`));
        try {
            await cleanupFilecoin();
            if (carResult?.carPath)
                await cleanupTempCar(carResult.carPath, log);
        }
        catch {
            /* ignore */
        }
        process.exit(1);
    }
}
//# sourceMappingURL=upload.js.map