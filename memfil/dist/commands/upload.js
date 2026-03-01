import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, createSynapse } from '../utils/client.js';
export async function uploadCommand(filePath, options) {
    // ── Validate file ────────────────────────────────────────────────────────────
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
        console.error(chalk.red(`✗ File not found: ${resolvedPath}`));
        process.exit(1);
    }
    const stats = fs.statSync(resolvedPath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    const fileName = path.basename(resolvedPath);
    const fileBytes = new Uint8Array(await fs.promises.readFile(resolvedPath));
    console.log(chalk.bold('\n📤  Filecoin Upload'));
    console.log(chalk.dim('─'.repeat(45)));
    console.log(chalk.dim(`  File   : ${fileName}`));
    console.log(chalk.dim(`  Size   : ${fileSizeKB} KB`));
    console.log();
    // ── Load config & create client ───────────────────────────────────────────────
    const config = loadConfig();
    const synapse = createSynapse(config.privateKey);
    // ── Upload to Filecoin ────────────────────────────────────────────────────────
    const uploadSpinner = ora(`Uploading ${fileName}…`).start();
    let uploadResult;
    try {
        const result = await synapse.storage.upload(fileBytes);
        let pieceCidString = String(result.pieceCid);
        const pc = result.pieceCid;
        if (typeof pc === 'object' && pc !== null && '/' in pc && typeof pc['/'] === 'string') {
            pieceCidString = pc['/'];
        }
        uploadResult = { pieceCid: pieceCidString, size: result.size };
    }
    catch (err) {
        uploadSpinner.fail('Upload failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n✗ ${message}`));
        process.exit(1);
    }
    uploadSpinner.succeed('Upload complete!');
    const cid = uploadResult.pieceCid;
    console.log();
    console.log(chalk.green('✅ File uploaded successfully'));
    console.log(chalk.bold('   PieceCID: ') + chalk.cyan(cid));
    // ── Optionally save CID to file ───────────────────────────────────────────────
    if (options.output) {
        const outPath = path.resolve(options.output);
        fs.writeFileSync(outPath, JSON.stringify({ pieceCid: cid, file: fileName, uploadedAt: new Date().toISOString() }, null, 2));
        console.log(chalk.dim(`\n  CID saved to: ${outPath}`));
    }
    console.log();
    console.log(chalk.dim('  Use the PieceCID above with the download command:'));
    console.log(chalk.dim(`  pnpm download "${cid}" --out ./downloads/${fileName}`));
    console.log();
}
//# sourceMappingURL=upload.js.map