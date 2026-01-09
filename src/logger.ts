import { createWriteStream, WriteStream } from 'node:fs';

let logStream: WriteStream | null = null;
let logPath: string | null = null;

export function configureLogger(options: { logFile?: string }): void {
  if (options.logFile && options.logFile !== logPath) {
    try {
      logPath = options.logFile;
      logStream?.end();
      logStream = createWriteStream(options.logFile, { flags: 'a' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const timestamp = new Date().toISOString();
      process.stderr.write(`${timestamp} [minecraft] [mcp-server] [warn] Failed to open log file ${options.logFile}: ${msg}\n`);
    }
  }
}

export function log(level: string, message: string): void {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} [minecraft] [mcp-server] [${level}] ${message}\n`;
  // Always write to stderr
  process.stderr.write(line);
  // Also write to file if configured
  if (logStream) {
    try {
      logStream.write(line);
    } catch {
      // ignore file write errors
    }
  }
}

process.on('exit', () => {
  try { logStream?.end(); } catch { /* ignore */ }
});