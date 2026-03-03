import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
const IPFS_GATEWAYS = [
    'https://ipfs.io/ipfs/',
    'https://dweb.link/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
];
async function fetchFromGateways(cid) {
    const errors = [];
    for (const base of IPFS_GATEWAYS) {
        const url = `${base}${cid}`;
        try {
            const res = await fetch(url);
            if (res.ok) {
                return await res.arrayBuffer();
            }
            throw new Error(`HTTP ${res.status}`);
        }
        catch (err) {
            errors.push(err instanceof Error ? err : new Error(String(err)));
        }
    }
    throw new Error(`Failed to fetch from all gateways: ${errors.map((e) => e.message).join('; ')}`);
}
export async function downloadCommand(cid, options) {
    if (!cid || cid.trim() === '') {
        console.error(chalk.red('✗ CID is required.'));
        process.exit(1);
    }
    const outFileName = options.out ?? `download-${cid.slice(0, 12)}.bin`;
    const outPath = path.resolve(outFileName);
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    console.log(chalk.bold('\n📥  Filecoin Download'));
    console.log(chalk.dim('─'.repeat(45)));
    console.log(chalk.dim(`  CID     : ${cid}`));
    console.log(chalk.dim(`  Save to : ${outPath}`));
    console.log();
    const spinner = ora('Fetching from IPFS gateway…').start();
    let data;
    try {
        data = await fetchFromGateways(cid);
        spinner.succeed('Download complete!');
    }
    catch (err) {
        spinner.fail('Download failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n✗ ${message}`));
        console.error(chalk.dim('\n  Make sure:'));
        console.error(chalk.dim('  • The CID is correct (IPFS root CID from upload)'));
        console.error(chalk.dim('  • The content was uploaded and IPNI-validated'));
        process.exit(1);
    }
    fs.writeFileSync(outPath, Buffer.from(data));
    const fileSizeKB = (data.byteLength / 1024).toFixed(2);
    console.log();
    console.log(chalk.green('✅ File saved successfully'));
    console.log(chalk.bold('   Path : ') + chalk.cyan(outPath));
    console.log(chalk.bold('   Size : ') + chalk.dim(`${fileSizeKB} KB`));
    console.log();
}
//# sourceMappingURL=download.js.map