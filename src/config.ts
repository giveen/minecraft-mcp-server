import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export interface ServerConfig {
  host: string;
  port: number;
  username: string;
  anythingLLM: boolean;
  logFile?: string;
}

export function parseConfig(): ServerConfig {
  const argv = yargs(hideBin(process.argv))
    .option('host', {
      type: 'string',
      description: 'Minecraft server host',
      default: 'localhost'
    })
    .option('port', {
      type: 'number',
      description: 'Minecraft server port',
      default: 25565
    })
    .option('username', {
      type: 'string',
      description: 'Bot username',
      default: 'LLMBot'
    })
    .option('anything-llm', {
      type: 'boolean',
      description: 'Enable AnythingLLM-specific behavior (stdio filtering, etc.)',
      default: false
    })
    .option('log-file', {
      type: 'string',
      description: 'Write logs to the specified file (in addition to stderr)'
    })
    .help()
    .alias('help', 'h')
    .parseSync();

  return {
    host: argv.host as string,
    port: argv.port as number,
    username: argv.username as string,
    anythingLLM: (argv['anything-llm'] as boolean) ?? false,
    logFile: (argv['log-file'] as string | undefined) || undefined
  };
}
