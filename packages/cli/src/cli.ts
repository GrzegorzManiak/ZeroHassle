import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { intro, select, isCancel, outro, log } from '@clack/prompts';
import * as commands from './commands';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envCandidates = [resolve(process.cwd(), '.env'), resolve(__dirname, '../../../.env')];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
    break;
  }
}

let args = [];
if (process.argv.slice(2).length === 0) {
  intro(`Welcome to the Nizzy CLI`);

  const user = process.env.USER || process.env.USERNAME || 'there';

  const command = await select({
    message: `Hey ${user}, what do you want to do?`,
    options: Object.values(commands).map((command) => ({
      label: command.description,
      value: command.id,
    })),
    maxItems: 5,
  });

  if (isCancel(command)) {
    outro('No worries, come back anytime!');
    process.exit(0);
  }

  args = [command];
} else {
  intro(`Nizzy CLI`);
  args = process.argv.slice(2);
}

if (['help', '-h', '--help'].includes(args[0])) {
  log.message('Available commands:');
  log.message(
    Object.values(commands)
      .map((command) => ` ${command.id.padStart(15)}    ${command.description}`)
      .join('\n'),
  );
  outro('Run `bun run nizzy` for an interactive experience\n');
  process.exit(0);
}

const command = Object.values(commands).find((command) => command.id === args[0]);

if (!command) {
  outro("Umm, I don't know how to do that yet");
  process.exit(0);
}

await command.run();
outro(`Done!`);
process.exit(0);
