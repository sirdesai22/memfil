import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../utils/client.js';
import { createPaymentFetch, getMarketplaceUrl } from '../utils/x402.js';
export async function buyAgentCommand(agentId, options) {
    if (!agentId || agentId.trim() === '') {
        console.error(chalk.red('✗ Agent ID is required.'));
        process.exit(1);
    }
    const config = loadConfig();
    const baseUrl = getMarketplaceUrl();
    const url = `${baseUrl}/api/agents/${agentId}/buy`;
    console.log(chalk.bold('\n🛒  Buy Agent'));
    console.log(chalk.dim('─'.repeat(45)));
    console.log(chalk.dim(`  Agent ID : ${agentId}`));
    console.log(chalk.dim(`  URL      : ${url}`));
    console.log();
    const spinner = ora('Requesting (will pay if 402 required)…').start();
    try {
        const fetchWithPayment = createPaymentFetch(config.privateKey);
        const response = await fetchWithPayment(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        const data = (await response.json());
        if (!response.ok) {
            spinner.fail('Request failed');
            console.error(chalk.red(`\n✗ ${data.error ?? `HTTP ${response.status}`}`));
            process.exit(1);
        }
        spinner.succeed('Payment complete!');
        if (data.agent) {
            console.log();
            console.log(chalk.green('✅ Agent endpoints revealed'));
            console.log(chalk.bold('   Name : ') + chalk.cyan(data.agent.name ?? 'Unknown'));
            if (data.agent.mcpEndpoint) {
                console.log(chalk.bold('   MCP  : ') + chalk.cyan(data.agent.mcpEndpoint));
            }
            if (data.agent.a2aEndpoint) {
                console.log(chalk.bold('   A2A  : ') + chalk.cyan(data.agent.a2aEndpoint));
            }
            if (data.agent.mcpTools?.length) {
                console.log(chalk.bold('   Tools: ') + chalk.dim(data.agent.mcpTools.join(', ')));
            }
            if (options.out) {
                const outPath = path.resolve(options.out);
                const outDir = path.dirname(outPath);
                if (!fs.existsSync(outDir)) {
                    fs.mkdirSync(outDir, { recursive: true });
                }
                fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
                console.log(chalk.dim(`\n  Saved to: ${outPath}`));
            }
            console.log();
            console.log(chalk.dim('  You can now call the agent via its MCP or A2A endpoint directly.'));
            console.log();
        }
    }
    catch (err) {
        spinner.fail('Request failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n✗ ${message}`));
        process.exit(1);
    }
}
//# sourceMappingURL=buy-agent.js.map